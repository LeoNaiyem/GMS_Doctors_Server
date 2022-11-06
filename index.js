const express = require("express");
const cors = require("cors");
const app = express();
const ObjectId = require("mongodb").ObjectId;
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

//MIDDLEWARE
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6w64q.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    const database = client.db("GMS_Doctors");
    const serviceCollection = database.collection("services");
    const appointmentCollection = database.collection("appointments");
    const paymentCollection = database.collection("payments");

    // loading data from the database
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/services/names", async (req, res) => {
      const servicesName = await serviceCollection
        .find()
        .project({ serviceName: 1, _id: 0 })
        .toArray();
      res.send(servicesName);
    });

    app.get("/services/:service", async (req, res) => {
      const serviceName = req.params.service;
      const query = { serviceName: serviceName };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    app.get("/appointments", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = appointmentCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/appointments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await appointmentCollection.findOne(query);
      res.send(result);
    });

    //sending data to the serverAp
    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    app.post("/appointments", async (req, res) => {
      const appointment = req.body;
      const result = await appointmentCollection.insertOne(appointment);
      res.send(result);
    });

    //deleting data from the server
    app.delete("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/appointments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await appointmentCollection.deleteOne(query);
      res.send(result);
    });

    //payment
    app.post("/create-payment-intent", async (req, res) => {
      const appointment = req.body;
      const price = appointment.price;
      const amount = price *100;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "USD",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.patch("/appointments/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: { paid: true, transactionId: payment.transactionId },
      };
      const updatedResult = await appointmentCollection.updateOne(
        filter,
        updatedDoc
      );
      const result = await paymentCollection.insertOne(payment);
      res.send(updatedResult);
    });

  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("GMS_Doctors Server is running");
});

app.listen(port, () => {
  console.log(`GMS_Doctors Server is listening at http://localhost:${port}`);
});
