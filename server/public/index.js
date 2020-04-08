// 只是启类型提示作用
// import $ from 'jquery';

$(() => {
    const socket = io({
        query: {
            identity: 'webPage',
        },
    });

    const $temperatureSpan = $('.temperature');
    const $humiditySpan = $('.humidity');
    const $temperatureRangeSpan = $('.temperature-range');
    const $humidityRangeSpan = $('.humidity-range');

    socket.on('real_time_upload', (data) => {
        $temperatureSpan.text(`${data.temperature}℃`);
        $humiditySpan.text(`${data.humidity}%`);
        $temperatureRangeSpan.text(`${data.minTemperatureToday} ~ ${data.maxTemperatureToday} ℃`);
        $humidityRangeSpan.text(`${data.minHumidityToday} ~ ${data.maxHumidityToday} %`);
    });

    // 基于准备好的dom，初始化echarts实例
    const temperatureChart = echarts.init(document.querySelector('.temperature-chart'));
    const humidityChart = echarts.init(document.querySelector('.humidity-chart'));

    socket.on('update_data_of_hours', (dataArray) => {
        const hours = dataArray.map((item) => item.hour);
        temperatureChart.setOption({
            title: {
                text: '当天各个小时的温度',
            },
            xAxis: {
                type: 'category',
                data: hours,
            },
            yAxis: {
                type: 'value',
            },
            series: [
                {
                    data: dataArray.map((item) => item.temperature),
                    type: 'line',
                },
            ],
        });

        humidityChart.setOption({
            title: {
                text: '当天各个小时的湿度',
            },
            xAxis: {
                type: 'category',
                data: hours,
            },
            yAxis: {
                type: 'value',
            },
            series: [
                {
                    data: dataArray.map((item) => item.humidity),
                    type: 'line',
                },
            ],
        });
    });
});
