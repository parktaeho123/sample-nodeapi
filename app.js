const express = require('express');
const path = require('path');
const passport = require('passport');
const morgan = require('morgan');
const session = require('express-session');
const nunjuck = require('nunjucks');
const dotenv = require('dotenv');
const v1 = require('./routes/v1');
const v2 = require('./routes/v2');
const logger = require('./logger');
const helmet = require('helmet');
const hpp = require('hpp');
const redis = require('redis');
const RedisStore = require('connect-redis')(session);



dotenv.config();
const redisClient = redis.createClient({
    url : `redis://${process.env.REDIS_HOST}: ${process.env.REDIS_PORT}`,
    password : process.env.REDIS_PASSWORD,
});




const authRouter = require('./routes/auth');
const passportConfig = require('passport');
const {Sequelize} = require('./models');
const indexRouter = require('./routes');
const cookieParser = require('cookie-parser');

const app = express();
passportConfig();

app.set('port' , process.env.PORT || 8002);
app.set('view engine' , 'html');
nunjuck.configure('views' , {
    expres : app,
    watch : true,  
});

Sequelize.sync({force : false})
.then(() => {
    console.log('데이터베이스 연결 성공');
}).catch((error) => {
    console.log(error);
});

if(prcess.env.NODE_ENV === 'production'){
    app.use(morgan('combined'));
    app.use(helmet({contentSecurityPolicy : false}));
    app.use(hpp());
}else{
    app.use(morgan('dev'));
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended : false}));
app.use(cookieParser(process.env.COOKIE_SECRET));

const sessionOption = {
    resave : false,
    saveUninitialized : false,
    secret : process_env_COOKIE_SECRET,
    cookie : {
        httpOnly : true,
        secure:false,
    },
    store : new RedisStore({client : redisClient}),
};
if(process.env_NODE_ENV === 'production'){
    sessionOption.proxy = true;
}

app.use(session(sessionOption));

app.use('/routes/v1',  v1);
app.use('/routes/v2', v2);
app.use(passport.initialize());
app.use(passport.session());
app.use('/auth', authRouter);
app.use('/', indexRouter);
app.use((req,res,next) => {
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    logger.info('hello');
    logger.error(error.message);
    next(error);
});

app.use((err,req,res,next) => {
    res.local.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status (err.status || 500);
    res.render('error');
});

app.listen(app.get('port'), () => {
    console.log(app.get('port'), `번 포트에서 대기중`);
});

module.exports = app;



