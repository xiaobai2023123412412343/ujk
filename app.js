var mysql = require('mysql');
var TelegramBot = require('node-telegram-bot-api');
var TronWeb = require('tronweb')
var request = require('request-promise');
var moment = require('moment');

/*配置区域 */
var pool = mysql.createPool({     //服务器本地
    port:3306, //mysql端口
    user     : 'shandui', //mysql用户名
    password : 'shandui', //mysql密码
    database : 'shandui', //mysql数据库
    multipleStatements: true //不要改这个
});
var token = "6235419886:d f fsx8eQdgiQdr9oiYAw" //机器人token
var address = "TMQj1T423KdkNVsdfizbkkkkk" //收款地址
var centeraddress = "TMQj1T42ddndMASa8izbkkkkk" //转账地址
var trxPrivateKey = "00df8c068466dcee97bcefb96ce3a3a5def5216f3c932c6f"; //私钥
var cunbiaddress = "TNcik3H9doc1VTzSGvhziHo" //存币地址(不识别这个地址的转账)
var mode = "main"//网络选择 main:主网 nile:nile网
var minCount_TRX = 14; //trx起兑金额
var minCount_USDT = 1;//usdt起兑金额
var duihuanbili_TRX = 14;//trx兑换比例
var duihuanbili_USDT = 0.05407;//usdt兑换比例
var adminid = 6196458860 //管理员的id
var adtime = 60; //定时发送时间 单位：分
var adqunid = -1001909876665;//定时发送的群id
var successqunid = -1001909876665; //兑换成功播报的群id
var yuzhimenkan = 10;
var yuzhiamount = 20;
var shouxvfei = 0.04
/*配置区域 */

var urlArray,tronWeb,contractaddress_usdt,
newordertimestamp_trx = Math.round(new Date()),
apiURL = [
    {
        trx:`https://api.trongrid.io/v1/accounts/${address}/transactions`,
        usdt:`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=20&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`,
        trx_replace:`https://api.trongrid.io/v1/accounts/replaceaddress/transactions`,
        usdt_replace:`https://api.trongrid.io/v1/accounts/replaceaddress/transactions/trc20?limit=20&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`,

    },
    {
        trx:`https://nile.trongrid.io/v1/accounts/${address}/transactions`,
        usdt:`https://nile.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=20&contract_address=TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj`,
        trx_replace:`https://nile.trongrid.io/v1/accounts/replaceaddress/transactions`,
        usdt_replace:`https://nile.trongrid.io/v1/accounts/replaceaddress/transactions/trc20?limit=20&contract_address=TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj`
    }
],
keyboard = [
    [{text:"🌐立即兑换"},{text:"💹实时U价"}],
    [{text:"💹实时U价"},{text:"🔔钱包监听"}],
    [{text:"💰TRX预支"},{text:"🏠个人中心"}],
],
inline_keyboard = [
    [{text:"➕ 添加地址", callback_data: 'add'},{text:"📒 地址薄", callback_data: '2'}],
],
start_inline_keyboard = [
    [{text:"💁在线客服", url: 'https://t.me/tg888k'},{text:"🐧官方频道", url: 'https://t.me/tg888k'}],
],
sendad_inline_keyboard = [
    [{text:"🚀开始闪兑", url: 'https://t.me/trx6666bot'},{text:"🙎♀️私聊老板", url:'https://t.m/etg88863'}],
],
bot = new TelegramBot(token, {polling: true}),
allUsdtListen = [],allTrxListen = [];
if (mode=="main") {
    urlArray =apiURL[0];
    contractaddress_usdt = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
    tronWeb = new TronWeb("https://api.trongrid.io", "https://api.trongrid.io", "https://api.trongrid.io", trxPrivateKey);
}else if(mode=="nile"){
    urlArray =apiURL[1];
    contractaddress_usdt = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";
    tronWeb = new TronWeb("https://api.nileex.io", "https://api.nileex.io", "https://api.nileex.io", trxPrivateKey);
}


function geturl(address,type) {
    if (type=="trx") {
        return urlArray['trx_replace'].replace(/replaceaddress/,address)
    }else if (type=="usdt"){
        return urlArray['usdt_replace'].replace(/replaceaddress/,address)
    }
}

setInterval(function() {
    listenUSDT(urlArray['usdt']);
    gettrxhuilv()
},3000)

setInterval(function(){
    bot.sendPhoto(adqunid,'https://cdn.pixabay.com/photo/2018/01/09/11/04/dog-3071334_1280.jpg',{
        caption:`🟢USDT兑换TRX 🔴（ 1 U起换）

向下方地址转账，自动在1分钟内给您返还同等价值的TRX（回原地址）

1️⃣1分钟内未自动回币
2️⃣回其他地址或trx兑换usdt
3️⃣不要使用交易所转账，丢失自负
以上情况请联系客服

单击下方地址自动复制【汇率1:14】
⚠️⚠️⚠️近期假冒盗版飞机泛滥，下方地址为TDHgpK开头,y5jnM结尾，如不一致请停止转账

自动兑换地址:\n<code>${address}</code> (点地址自动复制)`,
    // reply_markup: {
    //    inline_keyboard:sendad_inline_keyboard
    //},
        parse_mode:"HTML"
    })
},1000*60*adtime)

bot.on('text', (msg) => { 
    pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`SELECT * FROM users where telegramid = "${msg.from.id}"`,(error, result)=> {
        if (error) return error;
            if (!result[0]) {
                var inviter_telegramid = msg.text.split(" ")[1];
                if (!inviter_telegramid || parseInt(inviter_telegramid)%1!=0) {
                    inviter_telegramid = "无邀请人"
                }
                connection.query(`Insert into users (username,nickname,telegramid,register_time,inviter_telegramid) values ("${(msg.from.username?msg.from.username:"")}","${utf16toEntities((msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:""))}","${msg.from.id}",now(),"${inviter_telegramid}");`,(error, result)=> {
                    connection.destroy();
                    if (error) return error;
                    main(msg);
                });
            }else{
                connection.query(`update users set username =  "${(msg.from.username?msg.from.username:"")}",nickname = "${utf16toEntities((msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:""))}" where telegramid =  "${msg.from.id}";`,(error, result)=> {
                    connection.destroy();
                    if (error) return error;
                    main(msg);
                });
            }
        })
    })
});



function main(msg){
    if(msg.text.search("/start")==0){
        start(msg)
    }
    
    if(msg.text=="🌐立即兑换"){
        duihuan(msg)
    }

    if(msg.text=="💹实时U价"){
        huilv(msg)
    }

    if (msg.text=="💰TRX预支") {
        yuzhi(msg)
    }

    if (msg.text=="🔔钱包监听") {
        detail(msg)
    }

    if (msg.text=="🏠个人中心") {
        usercenter(msg)
    }

    if(msg.text=="/admin" && msg.chat.id==adminid){
        admin(msg)
    }
    

    if(tronWeb.isAddress(msg.text)){
        bangdingaddress(msg)
    }
   
    
}

function bangdingaddress(msg) {
    pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`select * from users where trxaddress = '${msg.text}' ;`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            if (!result[0]) {
                pool.getConnection(function(err, connection) {
                    if (err) return err;
                    connection.query(`update users set trxaddress = "${msg.text}" where telegramid = '${msg.from.id}' ;`,(error, result)=> {
                        if (error) return error;
                        connection.destroy();
                        bot.sendMessage(msg.chat.id, `✅绑定成功\n新地址：<code>${msg.text}</code> `,{
                            parse_mode:"HTML"
                        })
                    });
                });
            }else{
                bot.sendMessage(msg.chat.id, `❌该地址已被其他用户绑定，请更换地址尝试 `,{
                    parse_mode:"HTML"
                })
            }
           
        });
    });
    
}

function duihuan(msg) {
    request(`https://apilist.tronscanapi.com/api/accountv2?address=${centeraddress}`)
    .then((body)=>{
        var userList = JSON.parse(body).withPriceTokens;
        var trxbalance = 0;
        var usdtbalance = 0;
        for (let index = 0; index < userList.length; index++) {
            if (userList[index].tokenAbbr=="trx") {
                trxbalance = userList[index].amount;
            }
        }
        bot.sendMessage(msg.chat.id, `<b>中心钱包余额: </b>\n${parseFloat(trxbalance).toFixed(2)} TRX\n\n<b>实时兑换汇率：</b>\n100 USDT = ${(duihuanbili_TRX*100).toFixed(2)} TRX（${minCount_USDT} USDT起兑）\n\n<b>自动兑换地址：</b>\n<code>${address}</code> (点地址自动复制)`,{
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id,
            reply_markup: {
                inline_keyboard:start_inline_keyboard
            }
        });
    })
}

function start(msg) {
    bot.sendMessage(msg.chat.id, `<b>✋${(msg.from.first_name?msg.from.first_name:"")+(msg.from.last_name?msg.from.last_name:"")}，欢迎使用闪兑机器人</b>`,{
        parse_mode:"HTML",
        reply_markup: {
            keyboard: keyboard,
            resize_keyboard:true
        }
    })
    .then(res=>{
        bot.sendMessage(msg.chat.id, `<b>实时兑换汇率:</b>\n100 USDT = ${(duihuanbili_TRX*100).toFixed(2)} TRX\n\n<b>自动兑换地址:</b>\n<code>${address}</code>  (点地址自动复制)`,{
            parse_mode:"HTML",
            reply_markup: {
                inline_keyboard:start_inline_keyboard
            }
        })
    })
}

function yuzhi(msg) {
    pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`SELECT * FROM users where telegramid = '${msg.from.id}' ;`,(error, result)=> {
            if (error) return error;
            var userinfo = result[0]
            connection.destroy();
            if (result[0].trxaddress=="未绑定地址") {
                bot.sendMessage(msg.chat.id, `<b>❌请先发送你的TRC20地址至机器人</b>`,{
                    parse_mode:"HTML",
                    reply_to_message_id:msg.message_id
                })
            }else if (result[0].balance<0) {
                bot.sendMessage(msg.chat.id, `<b>❌您当前仍有预支的 ${0-result[0].balance}TRX 未归还</b>`,{
                    parse_mode:"HTML",
                    reply_to_message_id:msg.message_id
                })
            }else if (result[0].zongliushui<yuzhimenkan) {
                bot.sendMessage(msg.chat.id, `<b>❌您当前累计闪兑小于${yuzhimenkan}TRX,无法使用预支功能</b>`,{
                    parse_mode:"HTML",
                    reply_to_message_id:msg.message_id
                })
            }else{
                tronWeb.trx.sendTransaction(result[0].trxaddress, parseInt(yuzhiamount*1000000))
                .then(res=>{
                    pool.getConnection(function(err, connection) {
                        if (err) throw err;
                        connection.query(`update users set balance = balance - ${yuzhiamount} where telegramid = "${msg.from.id}";insert into yuzhi (telegramid,amount,address,time) values ("${userinfo.telegramid}",${yuzhiamount},"${userinfo.trxaddress}",now())`,(error, result)=> {
                            if (error) throw error;
                            connection.destroy();    
                            bot.sendMessage(adminid,`<b>✅<a href="https://t.me/${userinfo.username}">${userinfo.nickname}</a>预支${yuzhiamount}TRX成功</b>\n\n地址：<code>${userinfo.trxaddress}</code>`,{
                                parse_mode: 'HTML',
                                disable_web_page_preview:true,
                                reply_markup:{
                                    inline_keyboard:[
                                        [{text:"查看详情",url:`https://tronscan.org/#/transaction/${res.txid}`}]
                                    ]
                                }
                            });
                            bot.sendMessage(msg.from.id,`<b>✅预支${yuzhiamount}TRX成功,请查收~</b>`,{
                                parse_mode: 'HTML',
                                reply_to_message_id:msg.message_id,
                                reply_markup:{
                                    inline_keyboard:[
                                        [{text:"查看详情",url:`https://tronscan.org/#/transaction/${res.txid}`}]
                                    ]
                                }
                            });
                        });
                    })
                })
                .catch(e=>{
                    bot.sendMessage(adminid,`<b>❌预支${yuzhiamount}TRX失败</b>\n\n地址：<code>${userinfo.trxaddress}</code>`,{
                        parse_mode: 'HTML',
                    });
                    bot.sendMessage(msg.from.id,`<b>❌预支${yuzhiamount}TRX失败</b>\n\n地址：<code>${userinfo.trxaddress}</code>\n\n交易哈希：<code>${res.txid}</code>`,{
                        parse_mode: 'HTML',
                    });
                    
                })
            }
            
        });
    });
}

function usercenter(msg) {
    pool.getConnection(function(err, connection) {
        if (err) return err;
        connection.query(`SELECT * FROM users where telegramid = '${msg.from.id}' ;`,(error, result)=> {
            if (error) return error;
            connection.destroy();
            bot.sendMessage(msg.chat.id, `用户账号：<code>${result[0].telegramid}</code>\n累计闪兑：<code>${result[0].zongliushui}</code> TRX\n当前预支：<code>${(0-result[0].balance)}</code> TRX\n预支地址：<code>${result[0].trxaddress}</code>`,{
                parse_mode:"HTML",
                reply_to_message_id:msg.message_id
            })
        });
    });
}

function admin(msg) {
    request(`https://apilist.tronscanapi.com/api/accountv2?address=${address}`)
    .then((body)=>{
        var userList = JSON.parse(body).withPriceTokens;
        var trxbalance = 0;
        var usdtbalance = 0;
        for (let index = 0; index < userList.length; index++) {
            if (userList[index].tokenAbbr=="trx") {
                trxbalance = userList[index].amount;
            }
            if (userList[index].tokenId=="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t") {
                usdtbalance = userList[index].balance/1000000;
            }
            
        }
        query(`SELECT * FROM exchange WHERE state = 0 limit 15;SELECT * FROM exchange WHERE state = 1 limit 15;`).then(result=>{
            var faillist = ""
            for (let index = 0; index < result[0].length; index++) {
                faillist += `<code>${result[0][index].to_amount}${result[0][index].to_coin}</code> <code>${result[0][index].to_address}</code>\n`;
            }
            var successlist = ""
            for (let index = 0; index < result[0].length; index++) {
                successlist += `<code>${result[0][index].to_amount}${result[0][index].to_coin}</code> <code>${result[0][index].to_address}</code>\n`;
            }
            bot.sendMessage(msg.chat.id,`TRX:  <code>${trxbalance}</code>\nUSDT :  <code>${usdtbalance}</code>\n\n失败记录：\n${faillist}\n\n成功记录：\n${successlist}`,{
                parse_mode: 'HTML',
            });
        })
    })
}
bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    if (callbackQuery.data.search("huilvbuy_")!=-1) {
        changehuilvbuy(callbackQuery)
    }
    
    if (callbackQuery.data.search("huilvsell_")!=-1) {
        changehuilvsell(callbackQuery)
    }

    if (callbackQuery.data=="back") {
        backhuilv(callbackQuery)
    }

    if (callbackQuery.data.search("tongji")!=-1) {
        tongji(callbackQuery)
        return
    }
    if (callbackQuery.data.search("addaddress")!=-1) {
        addaddress(callbackQuery)
        return
    }
    if (callbackQuery.data.search("detail")!=-1) {
        detail(callbackQuery)
        return
    }

    if (callbackQuery.data.search("delete")!=-1) {
        var address = callbackQuery.data.split("delete")[1]
        query(` DELETE from jiankong where address = "${address}" and telegramid = "${callbackQuery.message.chat.id}";`).then(result=>{
            bot.editMessageText(`请选择您的操作👇`,{
                chat_id:callbackQuery.message.chat.id,
                message_id:callbackQuery.message.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: inline_keyboard
                }
            });
            bot.answerCallbackQuery(callbackQuery.id,{
                text:`✅ 删除成功`
            })
        })
        return
    }
    
    switch (callbackQuery.data) {
        case "1":
            bot.editMessageText(`请选择您的操作👇`,{
                chat_id:callbackQuery.message.chat.id,
                message_id:callbackQuery.message.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: inline_keyboard
                }
            });
            break;
        case "2":
            query(`SELECT * FROM jiankong where telegramid = "${callbackQuery.message.chat.id}";`).then(result=>{
                var message = "";
                var button = [];
                for (let index = 0; index < result.length; index++) {
                    message = `${message}<code>${result[index].address}</code>\n`;
                    button.push([{text:result[index].address,callback_data:`detail${result[index].address}`}])
                }
                button.push([{text:"🏠 主菜单",callback_data:"1"}])
                bot.editMessageText(`🤖 监控地址, 共:${result.length}\n\n${message}`,{
                    chat_id:callbackQuery.message.chat.id,
                    message_id:callbackQuery.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: button
                    }
                });
            })
            break;
        case "add":
            bot.editMessageText(`📣 请回复 TRC20 地址`,{
                chat_id:callbackQuery.message.chat.id,
                message_id:callbackQuery.message.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{text:"⭕ 取消",callback_data:"1"}]
                    ]
                }
            });
            
            break;
        default:
            break;
    }
});

bot.on('error', (error) => { 
    console.log("监听到普通错误："+error);
});
bot.on('polling_error', (error) => {
    console.log("监听到轮循错误："+error);  
});
bot.on('webhook_error', (error) => {
    console.log("监听到webhook错误："+error);  
});
function addaddress(callbackQuery) {
    var address = callbackQuery.data.split("addaddress")[1]
    query(`select * from jiankong where address = "${address}" and telegramid = "${callbackQuery.message.chat.id}";`).then(result=>{
        if (result.length==0) {
            query(`insert into jiankong (telegramid,address,addtime,lasttimestamp_trx,lasttimestamp_usdt) values ("${callbackQuery.message.chat.id}","${address}",now(),"${Math.round(new Date())}","${Math.round(new Date())}");`).then(result=>{
                bot.editMessageText(`✅ 添加成功`,{
                    chat_id:callbackQuery.message.chat.id,
                    message_id:callbackQuery.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{text:"🏠 主菜单",callback_data:`1`}],
                        ] 
                    }
                });
            })
        }else{
            bot.answerCallbackQuery(callbackQuery.id,{
                text:`❌ 此地址已存在`
            })
        }
    })
}



function detail(callbackQuery) {
    var address = callbackQuery.data.split("detail")[1]
    query(`select * from transfer where address = "${address}" order by time desc limit 20;`).then(result=>{
        var detail = "";
        for (let index = 0; index < result.length; index++) {
            detail += `TXID:<code>${result[index].hashid}</code>\n收款人：<code>${result[index].fromaddress}</code>\n付款人：<code>${result[index].toaddress}</code>\n类型：<b>${(result[index].type=="to"?"转入":"转出")}</b>\n币种：<b>${result[index].coin.toUpperCase()}</b>\n金额：<b>${result[index].amount}</b>\n时间：<b>${result[index].time}</b>\n\n`;
        }
        bot.editMessageText(`🔰 监控到共:${result.length} 笔交易\n\n${detail}`,{
            chat_id:callbackQuery.message.chat.id,
            message_id:callbackQuery.message.message_id,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{text:"❌ 删除监控",callback_data:`delete${address}`}],
                    [{text:"🏠 主菜单",callback_data:`1`}],
                ] 
            }
        });
    })
}

function changehuilvbuy(msg) {
    var method = msg.data.split("huilvbuy_")[1]
	request({
		url: `https://www.okx.com/v3/c2c/tradingOrders/books?quoteCurrency=CNY&baseCurrency=USDT&side=sell&paymentMethod=${method}&userType=blockTrade&showTrade=false&receivingAds=false&showFollow=false&showAlreadyTraded=false&isAbleFilter=false&urlId=2`, //aliPay wxPay
	}, (error, response, body) => {
		if (!error || response.statusCode == 200) {
            var sendvalue,yhk = "银行卡",zfb = "支付宝",wx = "微信",all = "所有"
            if (method=="bank") {
                sendvalue= "<b><a href='https://www.okx.com/cn/p2p-markets/cny/buy-usdt'>🐻OKX欧意</a>【银行卡实时购买汇率】</b>\n\n";
                yhk = "✅银行卡"
            }else if (method=="aliPay") {
                sendvalue= "<b><a href='https://www.okx.com/cn/p2p-markets/cny/buy-usdt'>🐻OKX欧意</a>【支付宝实时购买汇率】</b>\n\n";
                zfb = "✅支付宝"
            }else if (method=="wxPay") {
                sendvalue= "<b><a href='https://www.okx.com/cn/p2p-markets/cny/buy-usdt'>🐻OKX欧意</a>【微信实时购买汇率】</b>\n\n";
                wx = "✅微信"
            }else if (method=="all") {
                sendvalue= "<b><a href='https://www.okx.com/cn/p2p-markets/cny/buy-usdt'>🐻OKX欧意</a>【实时购买汇率】</b>\n\n";
                all = "✅所有"
            }
            
			 
			var allprice = 0
			for (let index = 0; index < 10; index++) {
				const element = JSON.parse(body).data.sell[index];
				sendvalue = `${sendvalue}${element.nickName}  ${element.price}\n`
				allprice+= parseFloat(element.price)
			}
			sendvalue =`${sendvalue}\n实时价格：1 USDT * ${(allprice/10).toFixed(5)} = ${((allprice/10)).toFixed(2)}`
            bot.editMessageText(sendvalue,{
                chat_id:msg.message.chat.id,
                message_id:msg.message.message_id,
                reply_markup:{
                    inline_keyboard:[
                        [{text:all,callback_data:"huilvbuy_all"},{text:wx,callback_data:"huilvbuy_wxPay"},{text:zfb,callback_data:"huilvbuy_aliPay"},{text:yhk,callback_data:"huilvbuy_bank"}],
                        [{text:"返回",callback_data:"back"}],
                    ]
                },
                parse_mode:"HTML",
                disable_web_page_preview:true
            })
		}
	})
}



function backhuilv(msg) {
    bot.editMessageText('<b>选择查看价格类别👇</b>',{
        chat_id:msg.message.chat.id,
        message_id:msg.message.message_id,
        reply_markup:{
            inline_keyboard:[
                [{text:"购买价格",callback_data:"huilvbuy_all"},{text:"出售价格",callback_data:"huilvsell_all"}]
            ]
        },
        parse_mode:"HTML"
    })
}

function changehuilvsell(msg) {
    var method = msg.data.split("huilvsell_")[1]
	request({
		url: `https://www.okx.com/v3/c2c/tradingOrders/books?quoteCurrency=CNY&baseCurrency=USDT&side=buy&paymentMethod=${method}&userType=blockTrade`, //aliPay wxPay
	}, (error, response, body) => {
		if (!error || response.statusCode == 200) {
            var sendvalue,yhk = "银行卡",zfb = "支付宝",wx = "微信",all = "所有"
            if (method=="bank") {
                sendvalue= "<b><a href='https://www.okx.com/cn/p2p-markets/cny/buy-usdt'>🐻OKX欧意</a>【银行卡实时出售汇率】</b>\n\n";
                yhk = "✅银行卡"
            }else if (method=="aliPay") {
                sendvalue= "<b><a href='https://www.okx.com/cn/p2p-markets/cny/buy-usdt'>🐻OKX欧意</a>【支付宝实时出售汇率】</b>\n\n";
                zfb = "✅支付宝"
            }else if (method=="wxPay") {
                sendvalue= "<b><a href='https://www.okx.com/cn/p2p-markets/cny/buy-usdt'>🐻OKX欧意</a>【微信实时出售汇率】</b>\n\n";
                wx = "✅微信"
            }else if (method=="all") {
                sendvalue= "<b><a href='https://www.okx.com/cn/p2p-markets/cny/buy-usdt'>🐻OKX欧意</a>【实时出售汇率】</b>\n\n";
                all = "✅所有"
            }
            
			 
			var allprice = 0
			try {
			    for (let index = 0; index < 10; index++) {
        			const element = JSON.parse(body).data.buy[index];
        			sendvalue = `${sendvalue}${element.nickName}  ${element.price}\n`
        			allprice+= parseFloat(element.price)
        		}
        		sendvalue =`${sendvalue}\n实时价格：1 USDT * ${(allprice/10).toFixed(5)} = ${((allprice/10)).toFixed(2)}`
                bot.editMessageText(sendvalue,{
                    chat_id:msg.message.chat.id,
                    message_id:msg.message.message_id,
                    reply_markup:{
                        inline_keyboard:[
                            [{text:all,callback_data:"huilvsell_all"},{text:wx,callback_data:"huilvsell_wxPay"},{text:zfb,callback_data:"huilvsell_aliPay"},{text:yhk,callback_data:"huilvsell_bank"}],
                            [{text:"返回",callback_data:"back"}],
                        ]
                    },
                    parse_mode:"HTML",
                    disable_web_page_preview:true
                })
			} catch (e) {
			    return
			}
		}
	})
}


function huilv(msg) {
	bot.sendMessage(msg.chat.id,`<b>选择查看价格类别👇</b>`,{
        reply_markup:{
            inline_keyboard:[
                [{text:"购买价格",callback_data:"huilvbuy_all"},{text:"出售价格",callback_data:"huilvsell_all"}]
            ]
        },
        parse_mode:"HTML"
	});	
}
function utf16toEntities(str) {
    const patt = /[\ud800-\udbff][\udc00-\udfff]/g; // 检测utf16字符正则
    str = str.replace(patt, (char) => {
      let H;
      let L;
      let code;
      let s;

      if (char.length === 2) {
        H = char.charCodeAt(0); // 取出高位
        L = char.charCodeAt(1); // 取出低位
        code = (H - 0xD800) * 0x400 + 0x10000 + L - 0xDC00; // 转换算法
        s = `&#${code};`;
      } else {
        s = char;
      }

      return s;
    });

    return str;
}

function entitiestoUtf16(strObj) {
    const patt = /&#\d+;/g;
    const arr = strObj.match(patt) || [];

    let H;
    let L;
    let code;

    for (let i = 0; i < arr.length; i += 1) {
      code = arr[i];
      code = code.replace('&#', '').replace(';', '');
      // 高位
      H = Math.floor((code - 0x10000) / 0x400) + 0xD800;
      // 低位
      L = ((code - 0x10000) % 0x400) + 0xDC00;
      code = `&#${code};`;
      const s = String.fromCharCode(H, L);
      strObj = strObj.replace(code, s);
    }
    return strObj;
}

function listenUSDT(usdturl) {
    var tornPayList;
    request(usdturl)
    .then((body)=>{
        tornPayList = JSON.parse(body).data;
        for (let a = 0; a < tornPayList.length; a++) {
            if (tornPayList[a].type=="Transfer" &&  tornPayList[a].value/1000000>=minCount_USDT && tornPayList[a].block_timestamp+600000>Math.round(new Date())) {
                query(`SELECT * FROM exchange where from_transaction_id = "${tornPayList[a].transaction_id}";`).then(result=>{
                    if (!result[0] && tornPayList[a].value && tornPayList[a].to==address && tornPayList[a].to!=tornPayList[a].from && cunbiaddress!=tornPayList[a].from) {
                        query(`select * from users where trxaddress = "${tornPayList[a].from}";update users set balance = 0 where trxaddress = "${tornPayList[a].from}";INSERT INTO exchange (from_amount,from_coin,from_transaction_id,from_address,to_coin,to_address,timestamp,time) VALUES ("${tornPayList[a].value/1000000}","USDT","${tornPayList[a].transaction_id}","${tornPayList[a].from}","TRX","${address}",unix_timestamp(),now() );`)
                        .then(e=>{
                            transferTRX(tornPayList[a].from,(tornPayList[a].value*duihuanbili_TRX)/1000000+(e[0][0]?e[0][0].balance:0),tornPayList[a].transaction_id)
                        })
                    }
                })
            }
        }
    })
    
}

function transferTRX(trx_address,amount,txID) {
    tronWeb.trx.sendTransaction(trx_address, parseInt(amount*1000000))
    .then(res=>{
        pool.getConnection(function(err, connection) {
            if (err) throw err;
            connection.query(`select * from users where trxaddress = "${trx_address}";update exchange set to_transaction_id = "${res.txid}",to_amount = "${amount}",state = 1 where from_transaction_id = "${txID}";update users set zongliushui = zongliushui + ${amount} where trxaddress = "${trx_address}";`,(error, result)=> {
                if (error) throw error;
                connection.destroy();    
                bot.sendMessage(adminid,`<b>✅成功闪兑 <code>${amount}</code> TRX</b>\n\n地址：<code>${trx_address}</code>`,{
                    parse_mode: 'HTML',
                    reply_markup:{
                        inline_keyboard:[
                            [{text:"查看详情",url:`https://tronscan.org/#/transaction/${res.txid}`}]
                        ]
                    }
                });
                bot.sendMessage(successqunid,`<b>✅成功闪兑 <code>${amount}</code> TRX</b>\n\n地址：<code>${trx_address}</code>`,{
                    parse_mode: 'HTML',
                    reply_markup:{
                        inline_keyboard:[
                            [{text:"查看详情",url:`https://tronscan.org/#/transaction/${res.txid}`}]
                        ]
                    }
                });
                if (result[0][0]) {
                    bot.sendMessage(result[0][0].telegramid,`<b>✅成功闪兑 <code>${amount}</code> TRX</b>`,{
                        parse_mode: 'HTML',
                        reply_markup:{
                            inline_keyboard:[
                                [{text:"查看详情",url:`https://tronscan.org/#/transaction/${res.txid}`}]
                            ]
                        }
                    });
                }
            });
        })
    })
    .catch(e=>{
        pool.getConnection(function(err, connection) {
            if (err) throw err;
            connection.query(`update exchange set to_amount = "${amount}",state = 0 where from_transaction_id = "${txID}";`,(error, result)=> {
                if (error) throw error;
                connection.destroy();    
                bot.sendMessage(adminid,`<b>❌闪兑 <code>${amount}</code> TRX失败</b>\n\n地址：<code>${trx_address}</code>`,{
                    parse_mode: 'HTML',
                });
            });
        })
        
    })
}


function gettrxhuilv(value) {
    return
    request(`https://www.okx.com/priapi/v5/market/candles?instId=TRX-USDT`)
    .then((body)=>{
        duihuanbili_TRX = (1/parseFloat(JSON.parse(body).data[0][2]))*(1-shouxvfei)
    })
}


async function transferUSDT(trx_address,amount,txID) {
    
    var {abi} = await tronWeb.trx.getContract(contractaddress_usdt);
    const contract = tronWeb.contract(abi.entrys, contractaddress_usdt);
    var hashid = await contract.methods.transfer(trx_address, amount*1000000).send();
    pool.getConnection(function(err, connection) {
        if (err) throw err;
        connection.query(`update exchange set to_transaction_id = "${hashid}",to_amount = "${amount}" where from_transaction_id = "${txID}";`,(error, result)=> {
            if (error) throw error;
            connection.destroy();   
            bot.sendMessage(adminid,`兑换${amount}USDT成功\n\n地址：<code>${trx_address}</code>`,{
                parse_mode: 'HTML',
            }); 
            bot.sendMessage(successqunid,`转账${amount}USDT成功\n\n地址：<code>${trx_address}</code>\n\n交易哈希：<code>${hashid}</code>`,{
                parse_mode: 'HTML',
            });
        });
    })
}


function query( sql, values ) {
    return new Promise(( resolve, reject ) => {
      pool.getConnection(function(err, connection) {
        if (err) {
          reject( err )
        } else {
          connection.query(sql, values, ( err, rows) => {
  
            if ( err ) {
              reject( err )
            } else {
              resolve( rows )
            }
            connection.release()
          })
        }
      })
    })
  }