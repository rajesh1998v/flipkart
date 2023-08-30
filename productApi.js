var express = require("express");

let passport = require("passport");
let jwt = require("jsonwebtoken");
let JWTStrategy = require("passport-jwt").Strategy;
let ExtractJWT = require("passport-jwt").ExtractJwt;

let {brandpics, mobiles, pincodes,reviews,dealOfSell} = require("./productsData");
let {users,orders,carts,wishlists} = require("./userData");

var app = express();
app.use(express.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers","Origin, X-Requested-With,Content-Type, Accept");  
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
//   res.header('Access-Control-Allow-Headers', 'Content-Type,Accept');
  res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
//   res.header("Access-Control-Allow-Headers", "Authorization");
  next();
});

var port = process.env.PORT || 2410;

app.use(passport.initialize());

app.listen(port, () => console.log(`Node app listening on port ${port}`));

const parama = {
    jwtFromRequest:ExtractJWT.fromAuthHeaderAsBearerToken(),secretOrKey:"jwtsecret23647832"
};

const jwtExpirySeconds = 300;

let strategyAll = new JWTStrategy(parama,function(token,done){
    // console.log("In JWTStrategy-All", token);
    let user1 = users.find((u)=>u.id==token.id);
    // console.log("user",user1);
    if(!user1)
    return done(null, false,{message: "Incorrect username or password"});
    else return done(null,user1);
});

let strategyAdmin = new JWTStrategy(parama,function(token,done){
    // console.log("In JWTStrategy-All", token);
    let user1 = users.find((u)=>u.id==token.id);
    // console.log("user",user1);
    if(!user1)
    return done(null, false,{message: "Incorrect username or password"});
    else if(user1.role!=="admin")
    return done(null, false,{message: "You do not have admin"});
    else return done(null,user1);
});

passport.use("roleUser",strategyAll);
passport.use("roleAdmin",strategyAdmin);

app.post("/user",function(req,res){
    let {email,password} = req.body;
    let user = users.find((u)=>u.email==email && u.password===password);
    if(user){
        let payload = {id:user.id};
        let token = jwt.sign(payload,parama.secretOrKey,{
            algorithm: "HS256",
            // expiresIn:jwtExpirySeconds,
        });
        res.send({token: "bearer " + token});
    }else res.sendStatus(401);
});

app.post("/newUser",function(req,res){
  let body = req.body;
  let maxid = users.reduce((acc,curr)=>curr.id>acc?curr.id:acc,0);
  let user = users.find(u1=>u1.email===body.email);
  let mobileno = users.find(u1=>u1.mobileNo===body.mobileNo);
  if(user){
    res.send({error:"email address is already registered."});
  }else if(mobileno){
    res.send({error:"Mobile number is already registered."});
  } else{
    let newUser={id:maxid+1,...body};
    users.push(newUser);
    res.send("added successfully!")
  }
  
})
app.get("/user",passport.authenticate("roleUser",{session: false}),function(req,res){
    // console.log("In GET /user", req.user);
    res.send(req.user);
  });


app.get("/products/:category",function(req,res){
    let category = req.params.category;
    let brand = req.query.brand;
    let q = req.query.q;
    let assured = req.query.assured;
    let ram = req.query.ram;
    let rating = req.query.rating;
    let price = req.query.price;
    let sort = req.query.sort;
    let list = mobiles;
    if(q){
      q = q.toLowerCase()=="mobile"?"mobiles":q.toLowerCase();
      list = list.filter(p1=>p1.brand.toLowerCase()===q ||p1.category.toLowerCase()===q);
    }
       
    if(category)
     list.filter(c1=>c1.category===category); 
          
    if(brand){
      let arr = brand.split(",");
        list = list.filter((b1)=>arr.find(r1=>r1==b1.brand));
    }
        
    if(assured){
        list = list.filter(b1=>b1.assured==true);
    }
    if(ram){
        let arr = ram.split(",");
        list = list.filter((m1)=>arr.find(r1=>r1.slice(-1)<6? r1.slice(-1) == m1.ram:m1.ram>=6));
    }
    if(rating){
        let arr = rating.split(",");
        list = list.filter((m1)=>arr.find(r1=>r1.slice(-1) <= m1.rating));
    }
    if(price){
        let arr = price.split(",");
        list = list.filter((m1)=>
        arr.find(r1=>{
            let index = r1.indexOf("-");
            return index>=0?
            m1.price >= r1.substring(0,index) && m1.price <=r1.substring(index+1,r1.length):
            m1.price >= r1;
        }));
    }
    if(sort==="popularity"){
        list.sort((a, b) => {
            return a.popularity - b.popularity;
        });
    }
    if(sort==="desc"){
        list.sort((a, b) => {
            return b.price - a.price;
        });
    }
    if(sort==="asc"){
        list.sort((a, b) => {
            return a.price - b.price;
        });
    }

    let resArr = pagination(list, parseInt(req.query.page));
    let size=10;
    let pnum =  Math.ceil(list.length/size);
    let pageN=[];
    for(let i=1;i<=pnum;i++){
        pageN.push(i);
      }
    res.json({
      page: parseInt(req.query.page),
      items: resArr,
      totalItems: resArr.length,
      totalNum: list.length,
      pageno:pageN,
    });
    
  });

app.get("/productofDay",function(req,res){
  res.send(dealOfSell);
})
app.get("/productofDay/:productId",function(req,res){
  let productId = req.params.productId;
  let prod = dealOfSell.find(d1=>d1.id===productId);
  res.send(prod);
})
  
app.get("/product/:productId",function(req,res){
    let productId = req.params.productId;
    let mobile = mobiles.find(p1=>p1.id===productId);
    // console.log(mobile);
    res.send(mobile);
  });


app.get("/pincode/:pincode/:productId",function(req,res){
    try{
        let pincode = +req.params.pincode;
        let productId = req.params.productId;
        let pCode = pincodes.find(p1=>p1.pincode===pincode);
        let product = pCode.mobileList.find(m1=>m1.id===productId);
        // console.log(product);
        res.send(product);
    }catch(ex){
        res.send({status:404});
    }
  });

app.get("/reviews/:productId",function(req,res){
    let productId = req.params.productId;
    let review = reviews.find(m1=>m1.mobileId===productId);
    // console.log(review);
    res.send(review);
  });
app.get("/products/reviews",function(req,res){
    // console.log(reviews);
    res.send(reviews);
  });
app.get("/productBrand/:brand",function(req,res){
    let brand = req.params.brand;
    let brandpic = brandpics.find(m1=>m1.brand===brand);
    // console.log(review);
    res.send(brandpic);
  });

  app.post("/product/cart",function(req,res){
    let body = req.body;
    let prod = carts.find(c1=>c1.id==body.id);
    if(!prod){
        carts.unshift(prod);
    }
    // let newcart={...body}
    // booksTicket.push(newTikect);
    // console.log(newTikect);
    res.send(body.id);
  
  });


  app.get("/wishlist/:userId",passport.authenticate("roleUser",{session: false}),function(req,res){
    let userId = req.params.userId;
    let wish = wishlists.find(m1=>m1.userId==userId);
    let wish1 = wish?wish:{};
    // console.log(wish1);
    res.send(wish1);
  });

  app.post("/wishlist",passport.authenticate("roleUser",{session: false}),function(req,res){
    const {userId,product} = req.body;
    let wish = wishlists.find(c1=>c1.userId==userId);
    if(wish){
        let prodId = wish.wishList.find(p1=>p1.id==product.id);
        if(prodId){
            let index = wish.wishList.findIndex(p1=>p1.id==product.id);
            wish.wishList.splice(index,1);
        }else
            wish.wishList.unshift(product);
    }else{
        let wishlist1 = {userId:userId,wishList:[product]}
        wishlists.unshift(wishlist1);
    }
    // console.log(wishlists);
    res.send(wishlists);
  
  });
  app.get("/cart/:userId",function(req,res){
    let userId = req.params.userId;
    let cart = carts.find(m1=>m1.userId==userId);
    let cart1 = cart?cart:{};
    res.send(cart1);
  });
  app.post("/cart",function(req,res){
    const {userId,product} = req.body;
    let product1 = {...product,qty:1};
    let user = carts.find(c1=>c1.userId==userId);
    if(user){
        let prod = user.products.find(p1=>p1.id==product.id);
        if(!prod)
            user.products.unshift(product1);
    }else{
        let newProduct = {userId:userId,products:[product1]}
        carts.unshift(newProduct);
    }
    // console.log("p"+carts);
    res.send(carts);
  
  });

  app.put("/cart/:userId/:productId",function (req, res){
    let userId = req.params.userId;
    let productId = req.params.productId;
    let body = req.body;
    let user = carts.find(c1=>c1.userId==userId);
    // console.log(user);
    if(user){
        let prod = user.products.find(p1=>p1.id==productId);
        body.qty==1?prod.qty++:prod.qty--;
        // console.log(prod);
    }
   
 });

  app.delete("/cart/:userId/:productId",function(req,res){
    let userId = req.params.userId;
    let productId = req.params.productId;
    // console.log(userId,productId);
    let user = carts.find(c1=>c1.userId==userId);
    let index = user.products.findIndex(p1=>p1.id==productId);
    if(index>=0){
        user.products.splice(index,1);
    }
    res.send()
  });
  app.put("/profile/:userId",function (req, res){
    let userId = +req.params.userId;
    // console.log(userId);
    let body = req.body;
    let index = users.findIndex(c1=>c1.id===userId);
    // console.log(index);
    if(index>=0){
        let updateUser = {...users[index],...body}
        users[index] = updateUser;
        // console.log(updateUser);
        res.send(updateUser);
    }
   
});

app.put("/changePass/:userId",function (req, res){
  let userId = +req.params.userId;
  let body = req.body;
  // console.log(body);
  let user = users.find(c1=>c1.id===userId);
  if(user){
      user.password=body.retypePassword;
      res.status(404).send("Success");
    
  }
 
});

app.delete("/wishlist/:userId/:productId",function(req,res){
  let userId = req.params.userId;
  let productId = req.params.productId;
  let user = wishlists.find(c1=>c1.userId==userId);
  let index = user.wishList.findIndex(p1=>p1.id==productId);
  if(index>=0){
      user.wishList.splice(index,1);
  }
  res.send()
});

app.post("/order",passport.authenticate("roleUser",{session: false}),function(req,res){
  const {userId,products} = req.body;

  let user = orders.find(c1=>c1.userId==userId);
  if(user){
    user.products = products.concat(user.products);
  }else{
      let newProduct = {userId:userId,products:products}
      orders.unshift(newProduct);
  }
  carts=[];
  // console.log(orders);
  res.send(orders);

});

app.get("/order/:userId",passport.authenticate("roleUser",{session: false}),function(req,res){
  let userId = req.params.userId;
  let order = orders.find(m1=>m1.userId==userId);
  let order1 = order?order.products:{};
  res.send(order1);
});

  function pagination(obj, page) {
  const postCount = obj.length;
  const perPage = 14;
  //const pageCount = Math.ceil(postCount / perPage);
  var resArr = obj;
  resArr = resArr.slice(page * 14 - 14, page * 14);
  return resArr;
}


// for admin 

app.post("/admin",function(req,res){
  let {email,password} = req.body;
  let user = users.find((u)=>u.email==email && u.password===password);
  if(user){
      let payload = {id:user.id};
      let token = jwt.sign(payload,parama.secretOrKey,{
          algorithm: "HS256",
          // expiresIn:jwtExpirySeconds,
      });
      res.send({token: "bearer " + token});
  }else res.sendStatus(401);
});



app.get("/admin",passport.authenticate("roleAdmin",{session: false}),function(req,res){
  // console.log("In GET /user", req.user);
  res.send(req.user);
});

app.get("/products",passport.authenticate("roleAdmin",{session: false}),function(req,res){
  let page = req.query.page;
  page = page ? page : 1;
  let respArr = paginationAd(mobiles, page);
  let pageInfo = { pageNumber: page, numOfItems: respArr.length, totalItemCount: mobiles.length };
  res.json({
    pageInfo: pageInfo,
    stars: respArr,

  });

app.get("/allProducts",passport.authenticate("roleAdmin",{session: false}),function(req,res){
  res.send(mobiles);
  });

});
app.get("/products/:id",passport.authenticate("roleAdmin",{session: false}),function(req,res){
  let id = req.params.id;
  let product = mobiles.find(m1=>m1.id===id);
  res.send(product);
});


app.post("/products",passport.authenticate("roleAdmin",{session: false}),function(req,res){
  const body = req.body;
  let prod = mobiles.find(m1=>m1.id==body.id);
  if(prod){
    res.status(404).send("product id already exists");
  }else{
    mobiles.push(body);
    res.send("Upload successfully!");
    console.log(body);
  }
  // res.send(orders);

});
app.put("/product/:id",passport.authenticate("roleAdmin",{session: false}),function(req,res){
  const id = req.params.id;
  console.log(id);
  const body = req.body;
  console.log(body);
  let index = mobiles.findIndex(m1=>m1.id===id);
  mobiles[index] = body;
  res.status(200).send("Upload successfully!");
   

});

app.post("/productsCSV",passport.authenticate("roleAdmin",{session: false}),function(req,res){
  const body = req.body;
  let newArr = mobiles.concat(body);
  mobiles=newArr;
  // console.log(body);
  // let prod = mobiles.find(m1=>m1.id==body.id);
  
  // res.send(orders);

});


function pagination(obj, page) {
  const postCount = obj.length;
  const perPage = 10;

  //const pageCount = Math.ceil(postCount / perPage);
  var resArr = obj;
  resArr = resArr.slice(page * 10 - 10, page * 10);
  return resArr;
}

function paginationAd(obj, page) {
  const postCount = obj.length;
  const perPage = 10;
  //const pageCount = Math.ceil(postCount / perPage);
  var resArr = obj;
  resArr = resArr.slice(page * 5 - 5, page * 5);
  return resArr;
}
