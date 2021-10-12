const express = require('express');
const app = express();
const mongoose = require('mongoose');
const ejs = require('ejs');
const _ = require('lodash');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({
    dest: 'public/images/postimg/'
});
const fs = require('fs');
const session = require('express-session'); //PASSPORT_
const passport = require('passport'); //PASSPORT_
const LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require('passport-local-mongoose'); //PASSPORT_
require('dotenv').config(); // process.env.VariableFromDotEnvFile

const QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;
const nodemailer = require('nodemailer');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: false
}));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false
    }
}));
app.use(passport.initialize());
app.use(passport.session());


//EMAIL SETTINGS TO CONTACT FORM SHOULD BE MOVED TO DOTENV
//For easy test just go to https://ethereal.email/ -> click create button and copy "Nodemailer configuration". 
//Then just open mailbox to check if emails are coming. 
// const transporter = nodemailer.createTransport({
//     host: 'smtp.ethereal.email',
//     port: 587,
//     auth: {
//         user: '',
//         pass: ''
//     }
// });


//MONGOOSE DATABASE RELATED

mongoose.connect('mongodb://localhost:27017/blog', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

//SCHEMAS

const userSchema = new mongoose.Schema({ //PASSPORT_
    name: String,
    username: String,
    password: String
});


const postSchema = new mongoose.Schema({
    title: String,
    htmlContent: String,
    author: String,
    pubDate: [],
    tags: [],
    sponsored: Boolean,
    photo: String,
    withPhoto: Boolean,
    comments: [{
        body: String,
        date: Date,
        author: String
    }]
});

const informationSchema = new mongoose.Schema({
    draftid: String,
    postid: String
});

const tagSchema = new mongoose.Schema({
    tag: String
});
//PLUGINS
userSchema.plugin(passportLocalMongoose);


//MODELS
const Tag = mongoose.model("tag", tagSchema);
const Post = mongoose.model("post", postSchema);
const Draft = mongoose.model("draft", postSchema);
const Information = mongoose.model("information", informationSchema);
const User = mongoose.model("user", userSchema)


///////////////////DATABASE END///////////////////////

//PASSPORT STRATEGY 

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// PASSPORT USER REGISTRATION

// function registerUser(){
//     User.register({username: 'email@test', name: 'name'}, 'password', (err, user)=>{
//         if (err) {
//             console.log(err)
//         } else {
//             console.log(user)
//         }
//     })
// }
// registerUser();


//Authenticate user.
function checkAuthentication(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect("/login");
    }
}


// All requests to home side
var visitors = 0;
app.route('/')
    .get((req, res) => {
        visitors++
        const query = {
            pubDate: {
                $all: [false]
            }
        }
        sideHandler(res, query, 3, 6, 1);
    })
    // Search form post method
    .post(
        (req, res) => {
            const keyword = req.body.search
            const query = {
                $or: [{
                        title: {
                            "$regex": keyword,
                            "$options": "i"
                        }
                    },
                    {
                        htmlContent: {
                            "$regex": keyword,
                            "$options": "i"
                        }
                    },
                ],
                pubDate: {
                    $all: [false]
                }
            }
            Post.find(query, (err, results) => {
                postSearch(res, results, 1)
            })

        });


function postSearch(res, results, type) {
    Tag.find((err, tags) => {
        res.render('search', {
            results: results,
            type: type, //Type was to know if user used tag or search form and to set right title on the top of the search results for ex. All tagged $tag or All with keyword: $keyword, but i didnt done it :D 
            tags: tags
        })
    })
}



// End of search related things


app.post('/contact', (req, res) => { ///Post method to contact form
    // const subject = "You got a message from: " + req.body.email;
    // const recipient = process.env.EMAIL //Adress to receive emails <-
    // const html = req.body.email + " napisał: </br>" + req.body.message;


    // var mailOptions = {
    //     from: process.env.EMAIL,
    //     to: recipient,
    //     subject: subject,
    //     text: req.body.message,
    //     html: html
    // };

    // transporter.sendMail(mailOptions, function (error, info) {
    //     if (error) {
    //         console.log(error);
    //     } else {
    //         console.log('Email sent: ' + info.response);
    //     }
    // });
    res.redirect('/')
});

app.get('/post/:title', (req, res) => {
    const query = {
        pubDate: {
            $all: [false]
        }
    }
    const wanted = req.params.title;
    const date = wanted.substring(wanted.length - 8);
    const wantedTitle = wanted.substring(0, wanted.length - 9);
    Post.find(query, (err, posts) => {
        var toCheck = [];
        posts.forEach((post) => {
            if (_.lowerCase(_.kebabCase(wantedTitle)) === _.lowerCase(_.kebabCase(post.title))) {
                toCheck.push(post)
            }
        })
        toCheck.forEach((post) => {
            const tempDate = post.pubDate[0].toISOString();
            if (tempDate.search(date) > 0) {
                Tag.find((err, tags) => {
                    res.render('post', {
                        tags: tags,
                        post: post
                    })
                })
            }
        })
    })
})

app.get('/tag/:tag', (req, res) => {
    const keyword = req.params.tag;
    const query = {
        tags: {
            "$regex": keyword,
            "$options": "i"
        }
    }
    Post.find(query, (err, results) => {
        postSearch(res, results, 1)
    })
})

// Requests to page numbers

app.get('/page/:number', (req, res) => {

    const number = req.params.number;
    var numberInt = parseInt(number, 10);
    var toHandler = true;

    const query = {
        pubDate: {
            $all: [false]
        }
    }

    if (isNaN(numberInt) || numberInt < 1) {
        res.redirect("/page/1"); ///Change to NOT FOUND 404!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        toHandler = false;
    }

    const skip = (numberInt - 1) * 6 + 3;
    const limit = 6;
    toHandler && sideHandler(res, query, skip, limit, numberInt);
});


//Function to render homeside

function sideHandler(res, query, skip, limit, side) {
    Post.find(query).sort({ //This looks for normal posts
        _id: -1
    }).skip(skip).limit(limit).exec((err, posts) => {
        Post.find({
            pubDate: {
                $all: [false]
            }
        }).sort({ //This looks for 3 last added posts
            _id: -1
        }).limit(3).exec((err, newPosts) => {
            Post.countDocuments(query).exec(function (err, count) {
                const sides = Math.ceil((count - 3) / 6); //Here its -3 because first 3 posts are on home side, so they needed to be substracted to calculate right count of sides.
                Tag.find((err, tags) => {
                    if (!err) {
                        if (side > sides) {
                            res.redirect("/") //I should change this to 404 website but i dont have one and i will probably wont have so i will just leave it like this :D. 
                        } else {
                            res.render("index", {
                                posts: posts,
                                newPosts: newPosts,
                                side: side,
                                sides: sides,
                                tags: tags
                            });
                        }
                    } else {
                        console.log(err)
                    }
                })
            });
        });
    });
};


//Admin pages
//Just login
app.get('/login', (req, res) => {
    res.render('login')
});

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/admin/dashboard',
        failureRedirect: '/login',
    })
);


//Subpages
app.route('/admin/:side')
    .get(checkAuthentication, (req, res) => {
        const side = req.params.side
        Tag.find((err, tags) => {
            if (!err) {
                Draft.find().sort({
                    _id: -1
                }).exec((err, drafts) => {
                    if (!err) {
                        Information.find((err, inf) => {
                            if (!err) {
                                res.render('dashboard', {
                                    side: side,
                                    tags: tags,
                                    drafts: drafts,
                                    inf: inf,
                                    visitors: visitors
                                })

                            } else {
                                console.log(err)
                                res.sendStatus(404)
                            }

                        })

                    } else {
                        console.log(err)
                        res.sendStatus(404)
                    }
                })
            } else {
                console.log(err)
                res.sendStatus(404)
            }
        })
    })
    .post(checkAuthentication, async (req, res) => {

        const post = JSON.parse(JSON.stringify(req.body))
        const dat = new Date()

        switch (req.params.side) {
            case "add":
                const newpost = new Draft({
                    title: post.title,
                    htmlContent: post.post,
                    author: req.user.name,
                    pubDate: [
                        dat,
                        false
                    ],
                    withPhoto: post.withPhoto,
                    tags: JSON.parse(post.tags),
                    sponsored: post.sponsored,
                });
                newpost.save(function (err, data) {
                    if (err) {
                        res.sendStatus(500)
                    } else {
                        res.json({
                            status: 201,
                            id: data._id
                        })
                    }
                });

                break;


            case "publish": //Post methot to publish post
                const id = (JSON.parse(JSON.stringify(req.body))).id;
                const date = new Date();

                var status = await publish(id, date, false)
                res.sendStatus(status)

                break;
            case "unpublish":
                var status = await delPost(req.body.id)
                res.sendStatus(status)
                break;

            case "date":
                const obj = req.body;
                const isoDate = new Date(Date.parse(obj.date));
                const onDate = JSON.parse(obj.onDate);
                var status = 404;

                if (onDate) {
                    console.log("Publishing on date")
                    status = await publish(obj.id, isoDate, onDate)
                } else {
                    console.log("removing on date")
                    status = await delPost(obj.id)
                }

                res.sendStatus(status)
                break;
            case "tag":
                if (_.isEmpty(req.body.tag)) {
                    //To delete tag
                    Tag.deleteOne({
                        _id: req.body.id
                    }, (err, inf) => {
                        if (!err && inf.deletedCount == 1) {
                            res.sendStatus(200)
                        } else {
                            console.log(err)
                            res.sendStatus(400)
                        }
                    })
                } else {
                    //Adding tag
                    Tag.find({
                        tag: req.body.tag
                    }, (err, doc) => {
                        if (_.isEmpty(doc)) {
                            //IF TAG DOESNT EXIST THEN ADD IT 1/2 =>
                            //Its probably required because as i remember some function work with just tag names i think so double name could be a problem, and it has no sense to have same two tags...
                            const tag = new Tag({
                                tag: _.camelCase(req.body.tag)
                            })
                            tag.save((err, inf) => {
                                if (err) {
                                    console.log(err)
                                    res.sendStatus(500)
                                } else {
                                    res.redirect('/admin/tags')
                                }
                            })
                        } else {
                            // =>2/2 TAG ALREADY EXIST, JUST REFRESH PAGE.
                            res.redirect('/admin/tags')
                        }
                    })
                }
                break;
            default:
                console.log("WRONG POST METHOD, APP.JS SWITCH STATEMENT");
                res.sendStatus(404);
        }
    }).delete(checkAuthentication, (req, res) => {
        const post = JSON.parse(JSON.stringify(req.body))

        Information.findOne({ //This one unpublish post
            draftid: post.id
        }, (err, doc) => {
            if (!_.isEmpty(doc)) {
                if (!err) { 
                    delPost(doc.draftid) 
                } else {
                    console.log("Błąd app.js:390, usuwanie opublikowanego posta: " + err)
                }
            }
        })

        Draft.deleteOne({ //This one deletes draft
            _id: post.id
        }, (err, inf) => {
            if (!err) {
                if (inf.deletedCount === 1) {
                    res.sendStatus(200)
                } else {
                    res.sendStatus(404)
                }
            } else {
                console.log(err)
                res.sendStatus(404)
            }
        })


    }).patch(checkAuthentication, (req, res) => { // Patch function to save modified draft
        const data = JSON.parse(JSON.stringify(req.body))
        const {
            id,
            title,
            post,
            tags,
            sponsored,
            withPhoto
        } = data

        const body = {
            id: id,
            title: title,
            htmlContent: post,
            tags: JSON.parse(tags),
            sponsored: sponsored,
            withPhoto: withPhoto
        }

        Draft.findByIdAndUpdate(id, body, (err, post) => {
            if (!err) {
                if (post.withPhoto) {
                    Draft.findByIdAndUpdate(id, {
                        withPhoto: true
                    }, (err, doc) => {
                        if (!err) {
                            res.sendStatus(200) //Updated with picture
                        } else {
                            res.sendStatus(404) //Some error here 
                        }
                    })
                } else {
                    res.sendStatus(200) //Updated without picture
                }
            } else {
                res.sendStatus(404) //Document to patch was not found
            }
        })
    });


//Draft edit request
app.get('/admin/edit/:id', checkAuthentication, (req, res) => {
    Draft.findOne({
        _id: req.params.id
    }, (err, post) => {
        if (!err) {
            Tag.find((err, tags) => {
                if (!err) {
                    res.render('dashboard', {
                        side: 'edit',
                        tags: tags,
                        post: post
                    })
                } else {
                    console.log(err)
                    res.send(err)
                }
            })
        } else {
            console.log(err)
            res.send(err)
        }
    })

});

//POST to add main image //Image file name is set to post draft id.
app.post('/admin/add/img', checkAuthentication, upload.single('photo'), function (req, res) {

    const photo = req.file;
    const dest = photo.destination;
    const name = JSON.parse(JSON.stringify(req.body)).name; //ID FROM MONGOOSE DB
    const oldPath = photo.path;
    const originalName = photo.originalname;
    const extension = originalName.slice(originalName.lastIndexOf("."));
    const newPath = dest + name;
    // + extension; Adds extension to filename but it works without extension too so was easier to not add it.

    fs.rename(oldPath, newPath, () => {
        res.sendStatus(200);
    });
})


//JUST LOGOUT
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});


//////////////////////////////////Unpublish post function///////////////////////////////
function delPost(draftid) {
    return new Promise((resolve, reject) => {
        const now = new Date()
        Information.findOneAndDelete({
            draftid: draftid
        }, (err, doc) => {
            if (!err) {
                Draft.findOneAndUpdate({
                    _id: draftid
                }, {
                    pubDate: [now, false]
                }, {
                    new: false
                });

                Post.deleteOne({
                    _id: doc.postid
                }, (err, inf) => {
                    if (!err) {
                        if (inf.deletedCount === 1) {
                            resolve(200);

                        } else {
                            resolve(404);

                        }
                    } else {
                        console.log(err)
                        resolve(404);
                    }
                })
            }
        })
    })
}

/////// Publish function ////////////
function publish(id, date, onDate) {

    return new Promise((resolve, reject) => {

        Draft.findOneAndUpdate({
            _id: id
        }, {
            pubDate: [date, onDate]
        }, {
            new: true
        }, (err, doc) => {
            Information.findOne({
                draftid: id
            }, (err, inf) => {
                if (!err) {
                    if (!_.isEmpty(inf)) {
                        Post.findOneAndUpdate({
                            _id: inf.postid
                        }, {
                            pubDate: [date, false]
                        }, (err, nxt) => {
                            console.log("Zrobiłem tylko update")
                            resolve(200)
                        })
                    } else {
                        if (doc.title.length > 1 && doc.htmlContent.length > 1 && doc.withPhoto) {
                            const deltaOps = JSON.parse(doc.htmlContent).ops;
                            const converter = new QuillDeltaToHtmlConverter(deltaOps, {});
                            const html = converter.convert();
                            const newPost = new Post({
                                title: doc.title,
                                htmlContent: html,
                                author: doc.author,
                                pubDate: [date, onDate],
                                tags: doc.tags,
                                sponsored: doc.sponsored,
                                photo: id, //Just id NOT doc.id beacause it needs to be draft id, not post id, draft id is also image name.
                                withPhoto: true,
                            })
                            newPost.save((err, saved) => {
                                if (!err) {
                                    Information.findOne({
                                        draftid: id
                                    }, (err, doc) => {
                                        if (_.isEmpty(doc)) {
                                            const newInf = new Information({
                                                draftid: id,
                                                postid: saved.id
                                            })
                                            newInf.save((err, inf) => {
                                                if (!err) {
                                                    resolve(200);
                                                } else {
                                                    console.log(err)
                                                    resolve(400);
                                                }
                                            })
                                        } else {
                                            resolve(200);
                                        }
                                    })
                                } else {
                                    console.log(err)
                                    resolve(400);
                                }

                            })

                        } else {
                            resolve(400);
                        }

                    }
                } else {
                    console.log("Error message 000001: " + err)
                }

            })

        })
    })
    //ZAMKNIECIE FUNKCJI    
}

function onTimePub() { //On time publish function, just checks if its something to publish.
    const now = new Date()
    const query = {
        pubDate: {
            $all: [true]
        }
    }
    Draft.find(query, (err, docs) => {
        docs.forEach((doc, index) => {
            const docDate = new Date(doc.pubDate[0]);
            if (docDate < now) {
                console.log("Opublikowano: " + doc.id + ", Data: " + now)
                publish(doc.id, now, false)
            }
        })
    })
}

function interval() {
    var i = 0;
    setInterval(function () {
        if (i < 1) {
            console.log("Date/time publish function active")
            i++
        }
        onTimePub()
    }, 60000);
}

interval();

app.listen(process.env.PORT, () => {
    console.log("Server started");
});

app.use(function(req, res) {
    res.redirect('/');
});

//I think everything works, i wanted to add much more functionality to this(like comments, users etc) but i realized i will not use it so i wanted just to finish it asap and make something new. I would say this "project" was a speedrun. Many functions are made just to work with simple solutions, there are probably much more better ways to make them but i just wanted to make this work and finish. Views folder should look better but i was just adding files without special thinking. 
//But! This is first real website i made. It works, it has functionality, it looks like layout works too so i think its okay :D. It took about three weeks to build this and im aware its probably not even good :D To not say "its not perfect" :D I took just one course on Udemy, for about 10$, it has about 40 hours. I watched it and after i just started this and its finished now.
//So if You are reading this then was really nice to see you there and if you think to hire me then just not suggest yourself by the quaility of "this" beacause im used to make my best everytime I do something. Im starting already to build "my cv website", then i need to host it on my own vps server with linux and install some other services. Im learning also norwegian at the same time, so, im busy a bit and thats why i will not spend any more time on this. So C ya! Hope to hear from You soon ;P