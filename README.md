# ejsBlog

This is simple blog app. Don't look at it because it was first thing i did after one course of udemy, so there is no error handling, no async functions, only callbacks are used, CSS is really weak etc. You can check it just to compare with the last repo and check my progress. 

## A little summary...

This thing uses EJS as view engine, MongoDB, HTML, CSS and Node.js. But it's working completly, there's one big error, home page is showing redirect error when there's no posts published but it's possible to login to admin panel and add it. Except that, there was many things i thought over and everyhing was working. This app i hosted [here](https://old.blog.nbtb.eu). I turned off possibility to upload something thru this app in nginx, so every upload request will respond "413 Request Entity Too Large".

### Node packages

- Express
- Mongoose (databse)
- EJS (view engine)
- BodyParser
- Multer (Files upload)
- Passport (Login sessions)
- Nodemailer (To send emails)

Other things:

- [Quill.js](https://quilljs.com/) as text editor.
- As far as i remember, images are compressed and saved in Code64 in database.

It's possible to:

- Add, delete, edit, publish post.
- Publish posts automatically on date/time.

## And that's all here...

This is just trash now. I will not come back here :)
