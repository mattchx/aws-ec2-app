const nodemailer = require("nodemailer");
const awsSES = require("@aws-sdk/client-ses");
const { GetSecretValueCommand, SecretsManagerClient } = require("@aws-sdk/client-secrets-manager");
const { isEmailValid } = require('./util')

const express = require('express');
const app = express()
const port = 3000

const dotenv = require('dotenv');

dotenv.config()


const secret_name = "nodemailer-ses-secrets";

const client = new SecretsManagerClient({
    region: "us-east-1",
});

let secrets;

client.send(
    new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT",
    })
)
    .then((response) => {
        secrets = JSON.parse(response.SecretString);
    })
    .catch((error) => {
        throw error;
    });

// Add middleware to parse form data
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
    res.send('Hello World!')
})

// Add new POST route to handle form data
app.post('/mail', (req, res) => {
    const formData = req.body

    if (!isEmailValid(formData.email)) {
        res.status(400).send({ message: "Email is not valid" });
    }

    const ses = new awsSES.SES({
        apiVersion: "2010-12-01",
        region: "us-east-1", // Your region will need to be updated
        credentials: {
            accessKeyId: secrets.ACCESS_KEY,
            secretAccessKey: secrets.SECRET_KEY,
        },
    });

    // create Nodemailer SES transporter
    const transporter = nodemailer.createTransport({
        SES: { ses, aws: awsSES },
    });

    const sendMail = () => {
        // send mail
        transporter.sendMail(
            // mail options
            {
                from: "matthewchx@gmail.com",
                to: "mattcharlesh@gmail.com",
                subject: "WebDev Mentor Contact Form Alert",
                text: "This person has filled out your contact form: " + formData.email,
            },
            // callback
            (error, info) => {
                if (error) {
                    throw error('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.messageId);
                }
            }
        );
    };

    sendMail();

    res.send('Email sent out!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})