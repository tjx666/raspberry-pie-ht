#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from time import sleep, time

from smbus2 import SMBus
import socketio


def get_HT():
    """
    获取温湿度，延迟约 1 s
    """

    with SMBus(1) as bus:
        # SHT20 地址，0x40(64)
        addr = 0x40

        # 发送测量温度命令
        messure_temperature_command = 0xF3
        bus.write_byte(addr, messure_temperature_command)
        sleep(0.5)
        data0 = bus.read_byte(addr)
        data1 = bus.read_byte(addr)
        temperatute = data0 * 256 + data1
        cTemperature = round(-46.85 + (175.72 * temperatute) / 65536, 2)

        # 发送测量湿度命令
        messure_humidity_command = 0xF5
        bus.write_byte(addr, messure_humidity_command)
        sleep(0.5)
        data0 = bus.read_byte(addr)
        data1 = bus.read_byte(addr)
        humidity = data0 * 256 + data1
        humidity = round(-6 + (125 * humidity) / 65536, 2)

    return [humidity, cTemperature]


# 服务器配置
HOST = '127.0.0.1'
PORT = 3000
ADDRESS = 'http://%s:%s?identity=pi' % (HOST, PORT)
io = socketio.Client()
io.connect(ADDRESS)
print('connect to %s' % ADDRESS)


def real_time_upload():
    """
    处理实时上传数据
    """

    while True:
        humidity, cTemperature = get_HT()
        data = {
            'humidity': humidity, 'temperature': cTemperature, 'timestamp': time()}
        io.emit('real_time_upload', data)
        # print('upload data, humidity： %s%, temperature: %s℃' %
        #       (humidity, cTemperature))


def main():
    real_time_upload()


if __name__ == "__main__":
    main()
