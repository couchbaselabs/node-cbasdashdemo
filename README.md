# Couchbase Analytics Dashboard Example

This is a demonstration of the experimental Couchbase Analytics support within the Couchbase Node.js SDK.  This example shows the concepts you might put together to build an Analytics dashboard using Couchbase Server and Couchbase Analytics.

In this example, we take advantage of the travel sample data-set that ships with Couchbase Server 4.5.  We tie this together with Node.js, Chart.js to generate a dashboard which displays various metrics that can be extracted from Couchbase Server.

## Getting Started
To try out this demo, you simply need to clone the repository:

```
git clone https://github.com/couchbaselabs/node-cbasdashdemo
```

Run `npm install` in our cloned directory:

```
npm install
```

And finally run the application

```
npm start
```

Finally our server will be running and available at:

```
http://localhost:3000/
```

## Useful Links
Couchbase Server - [http://www.couchbase.com/nosql-databases/downloads](http://www.couchbase.com/nosql-databases/downloads)

[Couchbase Analytics Docs](http://developer.couchbase.com/documentation/server/current/analytics/introduction.html)
