const Koa = require('koa');
const koaStatic = require('koa-static');
const SocketIO = require('socket.io');
const { getHours } = require('date-fns');
const { CronJob } = require('cron');

require('./mongo');
const HTModel = require('./htModel');

const app = new Koa();

// 处理首页等静态资源
const staticServe = koaStatic(__dirname, { gzip: true });
app.use(async (ctx, next) => {
    // 静态资源的 path 必须 /public 开头
    if (ctx.url.startsWith('/public')) {
        await staticServe(ctx, next);
    } else {
        await next();
    }
});

const HOST = '127.0.0.1';
const PORT = 3000;
const httpServer = app.listen(PORT, HOST, () => {
    console.log(`server is running at http://${HOST}:${PORT}`);
});
const io = new SocketIO(httpServer);

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

// 保存所有通过网页建立 socket.io 链接的 socket
const webPageSockets;
let connectionId = 0;
io.on('connection', (socket) => {
    ++connectionId;
    const currentConnectionId = connectionId;

    const { identity } = socket.handshake.query;
    console.log(`[${currentConnectionId}] ${identity} connected!`);
    if (identity === 'webPage') {
        webPageSockets.add(socket);
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

        webPageSockets.values().forEach(() => {
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

// 每天凌晨重新初始化当天数据
const jobPerDayStart = new CronJob('0 0 0 * * *', initTodayData);
jobPerDayStart.start();

// 保存每个小时的数据
const dataOfHours = [];
// 每个小时 0 分钟获取当前温湿度
const jobPerHourStart = new CronJob('0 0 * * * *', async () => {
    if (getHours(Date.now()) === 0) {
        dataOfHours = [];
    }

    // 拿最近 10 条数据取平均数
    const latestTenItems = await HTModel.find({}).sort('-timestamp').limit(10);
    const averageData = latestTenItems.reduce(
        (pre, item, index) => {
            pre.humidity += item.humidity;
            pre.temperature += item.temperature;

            if (index === 9) {
                pre.humidity = (pre.humidity / 10).toFixed(2);
                pre.temperature = (pre.temperature / 10).toFixed(2);
            }

            return pre;
        },
        { humidity: 0, temperature: 0 },
    );
    dataOfHours.push(averageData);

    webPageSockets.forEach((socket) => {
        socket.emit('update_data_of_hours', dataOfHours);
    });
});
jobPerHourStart.start();
