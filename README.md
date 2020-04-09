## 树莓派中的配置

### 安装依赖

```bash
pip install smbus2
pip install "python-socketio[client]"
```

### 配置上传地址

```python
# 如果服务器部署到了云主机，将 raspberry-pie-ht/pi-client/main.py 中下面代码片段中的 HOST 改成云主机的公网 ip

# 服务器配置
HOST = '127.0.0.1'
PORT = 3000
ADDRESS = 'http://%s:%s?identity=pi' % (HOST, PORT)
io = socketio.Client()
io.connect(ADDRESS)
print('connect to %s' % ADDRESS)
```

### 启动获取并上传温湿度的 python 程序

```bash
# 将工作路径切换到项目根目录
python ./pi-client/main.py
```

## 服务器配置

### 安装 nodejs

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
# 下载 node v12.16.0
nvm install 12.16.1
# 使用 node v12.16.0
nvm use 12.16.1
```

### 安装 mongodb

官方文档：[Install MongoDB Community Edition on Ubuntu](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)，照着下面命令敲就是了。

```bash
# Import the public key used by the package management system
wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | sudo apt-key add -
# Create a list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.2.list
# Reload local package database
sudo apt-get update
# Install the MongoDB packages
sudo apt-get install -y mongodb-org
# Start MongoDB
sudo systemctl start mongod

# 其它有用的命令
# Verify that MongoDB has started successfully
sudo systemctl status mongod
# MongoDB will start following a system reboot by issuing the following command
sudo systemctl enable mongod
# Stop MongoDB
sudo systemctl stop mongod
# Restart MongoDB
sudo systemctl restart mongod
# Begin using MongoDB
mongo
```

### 安装依赖

```bash
// 确保当前的工作路径是项目根目录
// 全局安装 yarn
npm install yarn -g
yarn
```

### 启动服务器

```bash
// 确保当前的工作路径是项目根目录
yarn start
```

