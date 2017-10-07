const postingkey = "5Kib"
const TAGS = ['ru--apvot50-50']
const REBLOGGER = "upvote50-50"
const accountfilter = "upvote50-50"
const COMMENT = `**${REBLOGGER} сделал реблог :)**`
const TITLE = "Реблог upvote50-50"
const VOTEPOWER = 4000
const GOLOSNODE = "wss://ws.golos.io"

//
// \x1b[0m - белый

//-----------------------------------------------------------------------------
const golos = require("golos-js")

golos.config.set('websocket', GOLOSNODE)

//-----------------------------------------------------------------------------
// get all Followings
var authors_wl = []
function getAccountFollowings(){
    golos.api.getFollowCount(accountfilter, (err, count) => {
        console.log(`\x1b[92m Количество подписок ${JSON.stringify(count)} \x1b[0m`)
        if (err) return console.warn(err)
        let last = null
        
        function getfollowings (lastname) {
            golos.api.getFollowing(accountfilter, lastname, "blog", 100, function (errs, followings) {
                // c++
                // console.log("Enter", c, lastname)
                // Если ошибка - выведем лог в консоль и прервем работу			
                if (errs) return console.warn(errs)
                // Если переменая last (есть выше, пока пустая) будет равна имени последнего пользователя из сотни запрошенных
                // В очередном цикле, значит все подписки обработаны и запускаем следующую функцию checkReblogs
                if (last === followings[followings.length - 1].following) {
                    console.log(`${authors_wl}`)
                    // return console.log("OK", c, last)
                } else {
                    for (let z of followings) authors_wl.push(z.following)
                    last = followings[followings.length - 1].following
                    // console.log(`\nlast is ${last}`)
                    getfollowings(last)
                    // return console.log("ret")
                }
            })
            // return console.log("ret3")
        }
        getfollowings(last)
        // console.log("LLALLALALA")
        // return console.log("ret 1")
    })
    // return console.log("ret2")
}
getAccountFollowings()





const _ = require('lodash')

// State
const powerlimit = 97 // лимит силы голоса ниже которого идет ожидание восстановления
// var current_power // Текущая сила голоса
var processing = false // флаг процесса
// Таймеры
var timer = null // Таймер мониторинга блокчейна
var timer_vote = null; // Таймер для проверки времени голосования
const checkingPowerInterval = 1000 * 60 * 5 // 5 минут
var timerCheckingPower
//  other
var height = null // blockchain height
var counter = 0 // счетчик
var operators = []
// storage.getOperators("golos") // 0 элемент имя пользователя, 1 элемент - WIP (voting key), power - текущая сила голоса
var trusted = [] // ссылка на modelApp.items
var voteQueue = [] // Очередь на голосование по таймингу
var isOutOfPower = false // Флаг, означающий 


// Получаем состояние блокчейна
const getBlockchainState = (result) => {
    // console.log(result) // "start"
    return new Promise((resolve, reject) => {
        // console.log("GetBlockChainState ", resolve)
        golos.api.getDynamicGlobalProperties((err, result) => {
            if (err) {
                reject(err)
            }
            else {
                // console.log("resolve ", result);
                resolve(result)
            }
        })
    })
}

//Получаем номер свежего блока
const pluckBlockHeight = x =>{
    height = x.head_block_number
    // console.log("Pluck",height)
}

const printRes = (result) => {
    // console.log("Result", result)
}

// Достаем из блока набор данных
const unnestOps = (blockData) => {
    // метод map создает новый array применяя функцию переданную в первый аргумент к каждому элементу
    // используем метод flatten модуля lodash для извлечения элементов из вложенных списков и помещения в одноуровневый список
    try {
        return _.flatten(blockData.transactions.map(tx => tx.operations))
    } catch (err) {
        console.log("golosapi:", "============ No good block !!! ============")
        console.log("golosapi:", err)
        return (["0"])
    }
}

/// Получаем блок и отправляем на обработку в функцию
const selectOpHandler = (op) => {
    // logger.log('SelectOphandler', op)
    if (op[0] == "0") {
        console.log("golosapi: ", "No good opData handled");
        return;
    }
    const [opType, opData] = op
    // console.log("Counter \n", counter, op)
    //console.log(opType)
    
    if (opType === 'vote') {
        //reactToIncomingVotes(opData)
    }
    else if (opType === 'comment') {
        //reactToIncomingComments(opData)
        // console.log(opData.permlink)
        // console.log(op[1])
        checkPost(opData)
    }
}

/// поменяем имя функции с getBlockData на processBlockData т.к. ее назначение изменилось
const processBlockData = () => {
    // console.log("Process block")
    golos.api.getBlock(height, (err, result) => { // Получаем блок данных каждыйе три секунды
        if (err) {
            console.log("golosapi: ", err)
        }
        else {
            console.log(`\x1b[32m ============ НОВЫЙ БЛОК ============ height = ${height}\x1b[0m`)
            // console.log(`RESULT = ${result} height = ${height} `)
            if(result != null){
                // console.log("Incr height")
                unnestOps(result).forEach(selectOpHandler)
                height += 1
            }
        }
    })
}

/// Основной цикл
const startFetchingBlocks = () => {
    // var height = startingHeight
    console.log("golosapi: ", `Starting fetching = ${height}`)
    timer = setInterval(() => {
        processBlockData()
        //height += 1
    }, 3000)
    timer_vote = setInterval(()=>{
        checkVoteQueue()
    }, 20000)
}

//-----------------------------------------------------------------------------
// Check post for conditions
const checkPost = (opData) => {
    var {author, permlink, parent_author, json_metadata, title} = opData
    var tags
    if(json_metadata){
        console.log(`\x1b[33m Title ${title} \x1b[0m`)
        // console.log(json_metadata)
        var tags = JSON.parse(json_metadata).tags
        console.log(tags)
    }    
    console.log("Permlink ", permlink)
    // tags = JSON.parse(tags).tags
    var idx = -1;
    // console.log("---", author, permlink);
    if(authors_wl.includes(author) && tags){
        console.log(`\x1b[96m Автор ${author} в списке доверенных\x1b[0m`)
        if (permlink.indexOf("-notify-") < 0) {
            console.log(`\x1b[96m Не обновление \x1b[0m`)
            if(permlink.indexOf("re-") < 0 ) {
                console.log(`\x1b[96m Это отдельный пост \x1b[0m`)
                for(tag of TAGS){
                    if(tags.includes(tag)){
                        console.log(`\x1b[96m Тег соответствует ${tag}\x1b[0m`)
                        var now = Date.now();
                        // console.log(Date.now())
                        // console.log(trusted[idx].delay*60*1000)
                        var vote = {
                            delay:(Date.now()+1000),
                            author:author,
                            title:title,
                            permlink:permlink,
                            power: VOTEPOWER
                        }
                        voteQueue.push(vote)
                        console.log("golosapi: ","VoteQueue upd", voteQueue, vote)
                    }
                }
                
            }
        }
    }
}

// VotePromise
const vote = (wif, acc, author, permlink, power) => {
    return new Promise((resolve, reject) => {
        golos.broadcast.vote(wif, acc, author, permlink, power, (err, result) =>{
            if(err){
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}


// CheckVotingTimer

const checkVoteQueue = () => {
    console.log("golosapi: ",`Check queue: ${voteQueue}`, counter)
    if(voteQueue.length > 0) {
        console.log(`============ Wait for vote ============`)
    }  
    voteQueue.forEach((item, i) => {
        console.log("Voting Queue", item.author, item.permlink, (item.delay - Date.now()) / 1000)
        if(Date.now() >= item.delay){
            const json = JSON.stringify(
                ["reblog", {
                    account: REBLOGGER,
                    author: item.author,
                    permlink: item.permlink
                }]
            )
            golos.broadcast.customJson(postingkey, [], [REBLOGGER], "follow", json, (err, result) => {
                if (err) {
                    voteQueue.splice(i,1)
                    return
                }
                // После того, как мы сделали репост, отправим комментарий пользователю и проголосуем за его пост
                // Но здесь проблема, если делать реблоги мы можем сотням аккаунтов в секунду, то оставлять комментарии, не более раза в 20 секунд. 
                // Таким образом нам нужно задать острочку в 20 секунд для каждого комментария
                console.log(`\x1b[32m🔗 [Сделан реблог] [${item.author}] ${item.permlink}\x1b[0m`)
                setTimeout(() => {
                    // console.log("Timeout", count * 3000)
                    // Подпишем в jsonmetada наш скрипт, это полезно для аналитики платформы
                    let jsonMetadata = {
                        "tags": ["vik"],
                        "app": "Upvote 50-50, based on vik 's reblogger script t.me/@chain_cf"
                    }
                    let timestamp = Date.now();

                    // Отправляем комментарий с зараннее подготовленными в настройках скрипта параметрами
                    golos.broadcast.comment(postingkey, item.author, item.permlink, REBLOGGER,
                        'comment-from-' + REBLOGGER + timestamp,
                        TITLE,
                        COMMENT,
                        jsonMetadata, (err, result) => {
                            if (err) {
                                console.log(`\x1b[31m☹️ Невозможно отправить комменатарий к посту [${item.title}]\x1b[0m`)
                                voteQueue.splice(i,1)
                                return
                            }
                            console.log(`\x1b[96m💬 [Отправлен комментарий и upvote][${item.author}] ${item.title}\x1b[0m`)
                            golos.broadcast.vote(postingkey, REBLOGGER, item.author, item.permlink, VOTEPOWER, (error, result) => {
                                //console.log(error,result)
                                voteQueue.splice(i,1)
                            })
                        })
                }, 1000)
            })
        }
    })
}


const startBot = (operatorsList, trustedList) => {
    // logger.log("Startbot", trustedList, operatorsList)
    operators = operatorsList
    trusted = trustedList
    if(timer != null) return
    getBlockchainState()
    .then(pluckBlockHeight)
    .then(startFetchingBlocks)
    .catch((error)=>{console.log("golosapi: ", error)})
}

startBot("", "")