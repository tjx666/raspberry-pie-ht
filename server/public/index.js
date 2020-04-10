window.addEventListener('load', () => {
    const socket = io({
        query: {
            identity: 'webPage',
        },
    });

    const temperatureSpan = document.querySelector('.temperature');
    const humiditySpan = document.querySelector('.humidity');
    const temperatureRangeSpan = document.querySelector('.temperature-range');
    const humidityRangeSpan = document.querySelector('.humidity-range');

    // 当监听到服务器触发的上传实时数据事件时
    socket.on('real_time_upload', (data) => {
        temperatureSpan.textContent = `${data.temperature}℃`;
        // 超过 37 ℃ 标红
        if (data.temperature > 37) {
            temperatureSpan.style.color = 'red';
        }
        humiditySpan.textContent = `${data.humidity}%`;
        temperatureRangeSpan.textContent = `${data.minTemperatureToday} ~ ${data.maxTemperatureToday} ℃`;
        humidityRangeSpan.textContent = `${data.minHumidityToday} ~ ${data.maxHumidityToday} %`;
    });

    // 基于准备好的dom，初始化echarts实例
    const temperatureChart = echarts.init(document.querySelector('.temperature-chart'));
    const humidityChart = echarts.init(document.querySelector('.humidity-chart'));

    // 当监听到服务器触发的更新小时数据事件时
    socket.on('update_hours_data', (dataArray) => {
        const hours = dataArray.map((item) => item.hour);
        temperatureChart.setOption({
            title: {
                text: '当天各个小时的温度',
                left: 'center',
            },
            xAxis: {
                name: '时间',
                type: 'category',
                data: hours,
            },
            yAxis: {
                name: '温度 / ℃',
                type: 'value',
            },
            series: [
                {
                    type: 'line',
                    data: dataArray.map((item) => item.temperature),
                    label: {
                        show: true,
                    },
                    markLine: {
                        data: [
                            {
                                name: '高温报警线',
                                yAxis: 37,
                            },
                        ],
                    },
                },
            ],
        });

        humidityChart.setOption({
            title: {
                text: '当天各个小时的湿度',
                left: 'center',
            },
            xAxis: {
                name: '时间',
                type: 'category',
                data: hours,
            },
            yAxis: {
                name: '湿度 / %',
                type: 'value',
            },
            series: [
                {
                    type: 'line',
                    data: dataArray.map((item) => item.humidity),
                    label: {
                        show: true,
                    },
                },
            ],
        });
    });
});
