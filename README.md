git clone https://github.com/xiaobai2023123412412343/ujk.git
启动 node app.js

安装依赖
sudo apt update

sudo apt install nodejs

检查是否安装
 node -v 
 
安装npm
sudo apt install npm
检查
npm -v

安装
npm install mysql 
npm install node-telegran-bot-api
npm install tronweb
npm install moment




登录数据库
mysql -u root -p
CREATE USER 'shandui'@'localhost' IDENTIFIED BY 'shandui';
CREATE DATABASE shandui;
GRANT ALL PRIVILEGES ON shandui.* TO 'shandui'@'localhost';
FLUSH PRIVILEGES;
exit;


