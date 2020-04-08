const { resolve } = require('path');
const { promisify } = require('util');
const fs = require('fs');
const Koa = require('koa');
const koaStatic = require('koa-static');
const SocketIO = require('socket.io');
const { getHours } = require('date-fns');
const { CronJob } = require('cron');

require('./mongo');
const HTModel = require('./htModel');

const app = new Koa();

// 处理静态资源
const staticServe = koaStatic(__dirname, { gzip: true });
app.use(async (ctx, next) => {
    // 静态资源的 path 必须 /public 开头
    if (ctx.url.startsWith('/public')) {
        await staticServe(ctx, next);
    } else {
        await next();
    }
});

app.use(async (ctx, next) => {
    if (ctx.url === '/') {
        const indexHTMLPath = resolve(__dirname, './public/index.html');
        const indexHtml = await promisify(fs.readFile)(indexHTMLPath, { encoding: 'UTF-8' });
        ctx.body = indexHtml;
    }

    await next();
});

const HOST = '127.0.0.1';
const PORT = 3000;
const httpServer = app.listen(PORT, HOST, () => {
    console.log(`server is running at http://${HOST}:${PORT}`);
});
const io = new SocketIO(httpServer);

// 今天的温湿度范围数据
let maxHumidityToday;
let minHumidityToday;
let maxTemperatureToday;
let minTemperatureToday;

function initTodayData() {
    maxHumidityToday = Number.MIN_SAFE_INTEGER;
    minHumidityToday = Number.MAX_SAFE_INTEGER;
    maxTemperatureToday = Number.MIN_SAFE_INTEGER;
    minTemperatureToday = Number.MAX_SAFE_INTEGER;
}
initTodayData();
// 每天凌晨重新初始化当天数据
const jobPerDayStart = new CronJob('0 0 0 * * *', initTodayData);
jobPerDayStart.start();

// 保存每个小时的数据
const dataOfHours = [];
// 保存所有通过网页建立 socket.io 链接的 socket
const webPageSockets = new Set();
let connectionId = 0;
io.on('connection', (socket) => {
    ++connectionId;
    const currentConnectionId = connectionId;

    const { identity } = socket.handshake.query;
    console.log(`[${currentConnectionId}] ${identity} connected!`);
    if (identity === 'webPage') {
        webPageSockets.add(socket);
        socket.emit('update_data_of_hours', dataOfHours);
    }

    socket.on('real_time_upload', (data) => {
        const { humidity, temperature } = data;
        const ht = new HTModel(data);
        ht.save();

        if (humidity > maxHumidityToday) {
            maxHumidityToday = humidity;
        }

        if (humidity < minHumidityToday) {
            minHumidityToday = humidity;
        }

        if (temperature > maxTemperatureToday) {
            maxTemperatureToday = temperature;
        }

        if (temperature < minTemperatureToday) {
            minTemperatureToday = temperature;
        }

        [...webPageSockets].forEach((socket) => {
            socket.emit('real_time_upload', {
                ...data,
                maxHumidityToday,
                minHumidityToday,
                maxTemperatureToday,
                minTemperatureToday,
            });
        });
    });

    socket.on('disconnect', () => {
        console.log(`[${currentConnectionId}] ${identity} disconnected!`);
        if (identity === 'webPage') {
            webPageSockets.delete(socket);
        }
    });
});

// cron 这个定时任务库实测会快个 1 秒左右
// 每个小时 0 分钟 0 秒获取当前温湿度
const jobPerHourStart = new CronJob('3 0 * * * *', async () => {
    // 这里假设时间误差范围最大为 3 秒
    const now = Date.now();
    const nowHour = getHours(now);
    const delayHour = getHours(now + 3 * 1000);
    const currentHour = delayHour !== nowHour ? delayHour : nowHour;

    // 是凌晨就清空前一天的数据
    if (currentHour === 0) {
        dataOfHours = [];
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
    dataOfHours.push(averageData);

    webPageSockets.forEach((socket) => {
        socket.emit('update_data_of_hours', dataOfHours);
    });
});
jobPerHourStart.start();
