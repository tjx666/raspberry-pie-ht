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
        $temperatureRangeSpan.text(`${data.minTemperatureToday} ~ ${maxTemperatureToday} ℃`);
        $humidityRangeSpan.text(`${data.minHumidityToday} ~ ${maxHumidityToday} %`);
    });
});
