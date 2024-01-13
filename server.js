const express = require('express');
const { createPool } = require('mysql2');

const session = require('express-session')
var cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');


const app = express();

const pool = createPool({

    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'pragthi',
    connectionLimit: 1
}).promise()

app.use(session({
    secret: 'fdlaksfjdk',
    cookie: { maxAge: 400000 },
    saveUninitialized: false

}))


app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


async function checkLogin(email, password) {

    if (email != undefined && password != undefined) {

        console.log("fetching result")
        var result = await pool.query('select password from users where email = ?', [email])



        if (result[0].length > 0) {
            if (result[0][0]['password'] == password) {


                return true;

            }
        }


    }

    return false;
}




const port = 3000;

app.set("view engine", "ejs");

app.use('/static', express.static('static'));



app.get('/', (req, res) => {

    res.render('home')
})

app.get('/search', async (req, res) => {

    let result = await pool.query("select * from products")
    console.log(result)

    res.render('products_list2', { products: result[0] })





})


app.get('/details', async (req, res) => {

    let result = await pool.query('select * from products where product_id = ?', [req.query['product']])



    res.render('product_details', { 'details': result[0][0] })



})

app.get('/purchase_details', (req, res) => {


    let email = req.cookies['email'];
    let password = req.cookies['password'];

    let productId = req.query['product']

    checkLogin(email, password).then((status) => {
        if (status) {
            res.render('purchase_details', { product: productId })
        } else {
            console.log(req.url)
            req.session.next = req.url;
            res.redirect('/login')
        }

    })

})

app.get('/login', (req, res) => {


    res.render("signin")

})


app.post('/check_login', (req, res) => {
    console.log("checking login")
    console.log(req.body)
    let email = req.body['email'];
    let password = req.body['password'];

    console.log(email, password)


    checkLogin(email, password).then((status) => {




        if (status) {
            console.log('login success')
            res.cookie("email", email);
            res.cookie("password", password);

            console.log(req.session.next);
            if (req.session.next == undefined) {
                res.redirect("/")
            } else {
                res.redirect(req.session.next)
            }

        } else {
            res.redirect('/login')
        }
    })

})


app.post('/complete_purchase', async (req, res) => {

    console.log('completing purchase')

    let email = req.cookies['email']
    let password = req.cookies['password']


    let userId = await pool.query("select user_id from users where email = ?", [email]);

    let productId = req.body['product_id']
    let phone = req.body['phone']
    let address = req.body['address']
    let state = req.body['state']
    let city = req.body['city']
    let pin_code = req.body['pin_code']
    let land_mark = req.body['land_mark']




    await checkLogin(email, password).then(async (status) => {

        if (status) {

            console.log("here")

            pool.query("insert into orders values(default , ? , ?, ? , ? , ? , ? , ? , now())", [userId[0][0]['user_id'], productId, address, state, city, pin_code, land_mark])

            res.redirect('/my_orders')

        }else{

            res.redirect("/login")
        }
    })

})


app.get('/my_orders', async (req, res) => {

    let email = req.cookies['email']
    let password = req.cookies['password']

    checkLogin(email, password).then(async (status) => {

        if (status) {

            let data = await pool.query("select * from orders , products , users where users.user_id = orders.user_id and products.product_id = orders.product_id and users.email = ?", [email])
            console.log(data[0], typeof Array.from(data[0]))
            res.render("ordered_products", { products: data[0] })
        }
        else {
            req.cookies.next = req.url
            redirect('/login')
        }

    })





})


app.listen(port, () => {

    console.log('server listening at port 3000');
})