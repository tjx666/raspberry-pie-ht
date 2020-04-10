## 树莓派中的配置

### 安装依赖

```bash
pip install smbus2
pip install "python-socketio[client]"
```

### 配置上传地址

```python
# 将 HOST 改成部署 node 服务器的机器的 ip

# 服务器配置
HOST = '服务器 ip'
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
# 下载 node 12.16.2
nvm install 12.16.2
# 使用 node 12.16.2
nvm use 12.16.2
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
// 安装 yarn
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install yarn

// 将工作路径切换到项目根目录
// 安装 node server 依赖
yarn
```

### 启动服务器

```bash
// 将工作路径切换到项目根目录
node ./server/index.js
```
