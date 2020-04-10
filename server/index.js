const { resolve } = require('path');
const { promisify } = require('util');
const fs = require('fs');
const Koa = require('koa');
const koaStatic = require('koa-static');
const SocketIO = require('socket.io');
const { getHours, isToday } = require('date-fns');
const { CronJob } = require('cron');

require('./mongo');
const HTModel = require('./htModel');

// 构造一个应用实例
const app = new Koa();

// 处理静态资源中间件，静态资源就是 public 文件夹下面的 index.html, css, js 文件
const staticServe = koaStatic(__dirname, { gzip: true });
app.use(async (ctx, next) => {
    // 静态资源的 path 必须 /public 开头
    if (ctx.url.startsWith('/public')) {
        // 调用处理静态资源的中间件
        await staticServe(ctx, next);
    } else {
        await next();
    }
});

// 处理首页
app.use(async (ctx, next) => {
    // 当 url path 是 / 也就是访问首页时，读取 public/index.html 内容字符串返回
    if (ctx.url === '/') {
        const indexHTMLPath = resolve(__dirname, './public/index.html');
        const indexHtml = await promisify(fs.readFile)(indexHTMLPath, { encoding: 'UTF-8' });
        ctx.body = indexHtml;
    }

    await next();
});

const HOST = '0.0.0.0';
const PORT = 3000;
const httpServer = app.listen(PORT, HOST, () => {
    console.log(`server is running at http://${HOST}:${PORT}`);
});
// 将 socket.io 绑定到 httpServer
const io = new SocketIO(httpServer);

// 今天的温湿度范围数据
let rangeData = {};
function initRangeData(data) {
    if (data) {
        Object.assign(rangeData, data);
    } else {
        rangeData.maxHumidityToday = Number.MIN_SAFE_INTEGER;
        rangeData.minHumidityToday = Number.MAX_SAFE_INTEGER;
        rangeData.maxTemperatureToday = Number.MIN_SAFE_INTEGER;
        rangeData.minTemperatureToday = Number.MAX_SAFE_INTEGER;
    }
}
initRangeData();

// 保存每个小时的数据
let hoursData = [];
const storePath = resolve(__dirname, './store.json');
// 如果有本地保存的数据使用本地保存的数据
if (fs.existsSync(storePath)) {
    const savedData = require('./store.json');
    if (isToday(savedData.timestamp)) {
        initRangeData(savedData.rangeData);
        hoursData = savedData.hoursData;
    }
}

function saveDataToJsonFile() {
    fs.writeFile(
        storePath,
        JSON.stringify(
            {
                rangeData,
                hoursData,
                timestamp: Date.now(),
            },
            null,
            4,
        ),
        {
            encoding: 'UTF-8',
        },
        (err) => {
            if (err) console.error(err);
        },
    );
}

// 保存所有通过网页建立 socket.io 链接的 socket
const webPageSockets = new Set();
// connectionId 只是为了在输出的 log 中标识每个 socket 链接
let connectionId = 0;
io.on('connection', (socket) => {
    ++connectionId;
    const currentConnectionId = connectionId;

    const { identity } = socket.handshake.query;
    console.log(`[${currentConnectionId}] ${identity} connected!`);
    if (identity === 'webPage') {
        webPageSockets.add(socket);
        socket.emit('update_hours_data', hoursData);
    }

    socket.on('real_time_upload', (data) => {
        const { humidity, temperature } = data;
        const ht = new HTModel(data);
        ht.save();

        if (humidity > rangeData.maxHumidityToday) {
            rangeData.maxHumidityToday = humidity;
            saveDataToJsonFile();
        }

        if (humidity < rangeData.minHumidityToday) {
            rangeData.minHumidityToday = humidity;
            saveDataToJsonFile();
        }

        if (temperature > rangeData.maxTemperatureToday) {
            rangeData.maxTemperatureToday = temperature;
            saveDataToJsonFile();
        }

        if (temperature < rangeData.minTemperatureToday) {
            rangeData.minTemperatureToday = temperature;
            saveDataToJsonFile();
        }

        Array.from(webPageSockets).forEach((socket) => {
            socket.emit('real_time_upload', {
                ...data,
                ...rangeData,
            });
        });
    });

    socket.on('disconnect', () => {
        console.log(`[${currentConnectionId}] ${identity} disconnected!`);
        // 网页的 socket 链接断开时移除掉保存的 socket
        if (identity === 'webPage') {
            webPageSockets.delete(socket);
        }
    });
});

// 每天凌晨重新初始化当天数据
const jobPerDayStart = new CronJob('0 0 0 * * *', initRangeData);
jobPerDayStart.start();

// cron 这个定时任务库实测会快个 1 秒左右
// 每个小时 0 分钟 0 秒获取当前温湿度
const jobPerHourStart = new CronJob('0 0 * * * *', async () => {
    // 考虑到定时任务有误差，可能 23:59:59 时就触发了，这个时候获取到的小时数就是 23，不是预期的 0
    // 这里假设时间误差范围最大为 3 秒
    const now = Date.now();
    // 当前时间计算出的小时
    const nowHour = getHours(now);
    // 延迟 3 秒计算出的小时
    const delayHour = getHours(now + 3 * 1000);
    // 延迟 3 秒计算出的小时和当前时间小时数不同就取延迟 3 秒后的小时
    const currentHour = delayHour !== nowHour ? delayHour : nowHour;

    // 是凌晨就清空前一天的数据
    if (currentHour === 0) {
        hoursData = [];
    }

    // 拿最近 10 条数据取平均值
    const latestTenItems = await HTModel.find({}).sort('-timestamp').limit(10);
    // 极限情况下有可能少于 10 条
    const itemsLength = latestTenItems.length;
    const averageData = latestTenItems.reduce(
        (pre, item, index) => {
            pre.humidity += item.humidity;
            pre.temperature += item.temperature;

            if (index === itemsLength - 1) {
                pre.humidity = (pre.humidity / itemsLength).toFixed(2);
                pre.temperature = (pre.temperature / itemsLength).toFixed(2);
            }

            return pre;
        },
        { humidity: 0, temperature: 0, hour: currentHour },
    );
    hoursData.push(averageData);
    saveDataToJsonFile();
    // 向所有的网页 socket 发布更新小时数据事件
    webPageSockets.forEach((socket) => {
        socket.emit('update_hours_data', hoursData);
    });
});
jobPerHourStart.start();
