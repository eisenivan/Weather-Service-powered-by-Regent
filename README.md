# Weather Service with Regent 3.x

## What is Regent?

`regent` was built to give you an easy way of asking true or false questions of an object. This allows `regent` to help you keep your business logic organized. Let's take a quick look at the basic syntax of `regent` before we get started.

```javascript
import { greaterThan } from 'regent'

const IS_WARM = greaterThan('@temperature', 70)

IS_WARM({ temperature: 80 }) // => true
```

_[Full Regent Documentation](https://northwesternmutual.github.io/regent/#/?id=documentation)_

## Let's build an App

Since the beginning we've used the weather to show-off `regent's` functionality, and we're not going to stop now.

## Project Setup

We're going to try to keep this application light. We will have two dependencies: `regent` (of course), and `node-fetch` to help us make our request to the weather API. Let's set up our npm project and install those dependencies.

```zsh
# create a directory to hold our app
mkdir regent-weather-app

# change directory (cd) into our new directory
cd regent-weather-app

# initialize npm, you can accept all defaults
npm init

# use npm to install regent and node-fetch
npm i regent node-fetch
```

The last thing we're going to do is create our main JavaScript file and import our dependencies.

```zsh
# create a file named weather.js
touch weather.js
```

_weather.js_
```javascript
// import fetch and regent
const fetch = require('node-fetch')
const regent = require('regent)
```

Now our project is setup and we're ready to push on.

## Getting weather data

We're going to use the [NOAA API](https://api.weather.gov/) to pull our weather data. For the purpose of this tutorial we're just going to hard-code a location into the API call. We're going to use [`node-fetch`](https://www.npmjs.com/package/node-fetch) to pull the data. `node-fetch` returns a promise. When that promise resolves we get an object with a `json` method that will return a promise and pass through our response as json.

_weather.js_
```javascript
fetch('https://api.weather.gov/gridpoints/MKX/88,63/forecast')
  .then(res => res.json())
  .then((data) => {
    console.log(data)
  })
```

This response has a lot in it, but we're going to focus on a select few pieces to keep this simple. Here is an example output with a *lot* of the information removed.

```
{
  "properties": {
      "periods": [
          {
              "name": "Today",
              "temperature": 39,
              "temperatureUnit": "F",
              "windSpeed": "5 mph",
              "windDirection": "W",
              "shortForecast": "Cloudy",
              "detailedForecast": "Cloudy, with a high near 39. West wind around 5 mph. New rainfall amounts less than a tenth of an inch possible."
          },
          {
              "name": "Tonight",                            
              "temperature": 31,
              "temperatureUnit": "F",
              "windSpeed": "5 to 10 mph",
              "windDirection": "W",
              "shortForecast": "Cloudy",
              "detailedForecast": "Cloudy, with a low around 31. West wind 5 to 10 mph."
          },
          {
              "name": "Sunday",                            
              "temperature": 36,
              "temperatureUnit": "F",
              "windSpeed": "10 to 15 mph",
              "windDirection": "SW",
              "shortForecast": "Partly Sunny",
              "detailedForecast": "Partly sunny, with a high near 36. Southwest wind 10 to 15 mph."
          }
      ]
  }
}
```

## Writing Our Business Logic

Now we need to figure out what our service will do. Looking at the data it looks like we have data for today, tonight, and tomorrow. I think we should compare tomorrow's temperature to today's.

Let's start with a rule to figure out if it is hot, cold, or moderate. We're going to define a rule for hot and cold, and then combine those rules to cover the rest of the situations.

First, let's import the `regent` functions we need. We will stop important all of regent and instead just import the functions we need.

```javascript
const { greaterThan, lessThan } = require('regent')
```

Now the hot rule. We will name it `HOT_TODAY`. We want to select the first period object in the `properties.periods` array and check to see if the value is above a threshold. I'm going to choose 75°, because I start to get too hot above that temperature.

```javascript
const HOT_TODAY = greaterThan('@properties.periods[0].temperature', 75)
```

Next we need a `COLD_TODAY` rule. I'll arbitrarily choose 50°. Your mileage may vary.

```javascript
const COLD_TODAY = lessThan('@properties.periods[0].temperature', 50)
```

Now we will create a `MODERATE_TODAY` rule. We can use Regent composition rules to create our rule based on `HOT_TODAY` and `COLD_TODAY` rules. We will need to import `not`, and `or` from regent along with `greaterThan` and `lessThan`. Our import state will now look like this.

```javascript
{ lessThan, greaterThan, not, or } = require('regent')
```

We want `MODERATE_TODAY` to return true if it is not `HOT_TODAY` or `COLD_TODAY`. We will use `or` to figure out if it is `HOT_TODAY` or `COLD_TODAY`, and then wrap that in a `not`.

```javascript
const MODERATE_TODAY = not(
  or(HOT_TODAY, COLD_TODAY)
)
```

Alright, let's use these rules with our weather data. We're going to console.log the results of the three rules we wrote. Our `weather.js` file now looks like this.

```javascript
const fetch = require('node-fetch')
const { greaterThan, lessThan, not, or } = require('regent')

const HOT_TODAY = greaterThan('@properties.periods[0].temperature', 75)
const COLD_TODAY = lessThan('@properties.periods[0].temperature', 50)
const MODERATE_TODAY = not(
  or(HOT_TODAY, COLD_TODAY)
)

fetch('https://api.weather.gov/gridpoints/MKX/88,63/forecast')
  .then(res => res.json())
  .then((data) => {
    console.log('Is it hot today? ', HOT_TODAY(data))
    console.log('Is it cold today? ', COLD_TODAY(data))
    console.log('Is it moderate today? ', MODERATE_TODAY(data))
  })
```

And our output looks like this. The current temperature at the time this was written was 39°F. ❄

```zsh
Is it hot today?  false
Is it cold today?  true
Is it moderate today?  false
```

## Slightly more advanced rules

Alright, now we're going to write some rules to compare tomorrow's temperature to today's. Regent provides two rules `some`, `every` that can iterate over an array and evaluate a rule on each node. We're going to use the `every` rule to check to see if the temperature tonight, and tomorrow, are less than or equal to today's temperature.

First we will create a rule named `COLDER_THAN_TODAY` which will compare the `temperature` value in each node against the `temperature` value in the first node.

```javascript
const COLDER_THAN_TODAY = lessThanOrEquals('@__.temperature', '@properties.periods[0].temperature')
```

We will need to import `lessThanOrEquals` from `regent`. There is a bit of new syntax in this new rule.

`@__.`

We refer to this as a _snail selector_. Regent is taking the current node of the array and assigning it to the object property `__`. You can read more about it in the [official documentation for the every predicate](https://northwesternmutual.github.io/regent/#/?id=every) if you're interested.

Our `COLDER_THAN_TODAY` rule doesn't do too much on it's own, so we will now write a rule that will define which object to iterate over.

```javascript
const GETTING_COLDER = every('@properties.periods', COLDER_THAN_TODAY)
```

That is all there is to it. Now we can run the `GETTING_COLDER` rule against data and it will return true if the temperature is less than or equal to today's temperature.

```json
{
  "properties": {
    "periods": [
      { "temperature": 60 },
      { "temperature": 59 },
      { "temperature": 58 },
      { "temperature": 57 },
    ]
  }
} // => true

{
  "properties": {
    "periods": [
      { "temperature": 60 },
      { "temperature": 59 },
      { "temperature": 90 }, // greater than 60
      { "temperature": 20 },
    ]
  }
} // => false
```

## Finishing up our service

Alright we have all our functionality written, it's time to finish up our service. Let's make this service return the `boolean` values of our rules so an external client can integrate this logic. We're going to make a few tweaks to our `weather.js` file.

We will return the value of all our rules except `COLDER_THAN_TODAY` since that is only a partial rule. Our `weather.js` file now looks something like this.

```javascript
const fetch = require('node-fetch')
const { greaterThan, lessThan, not, or, every, lessThanOrEquals } = require('regent')

// Define our rules
const HOT_TODAY = greaterThan('@properties.periods[0].temperature', 75)
const COLD_TODAY = lessThan('@properties.periods[0].temperature', 50)
const MODERATE_TODAY = not(
  or(HOT_TODAY, COLD_TODAY)
)

const COLDER_THAN_TODAY = lessThanOrEquals('@__.temperature', '@properties.periods[0].temperature')
const GETTING_COLDER = every('@properties.periods', COLDER_THAN_TODAY)

// Create a rules object. Notice that we aren't including
// the COLDER_THAN_TODAY rule because it is a partial rule
const rules = {
  HOT_TODAY,
  COLD_TODAY,
  MODERATE_TODAY,
  GETTING_COLDER
}

fetch('https://api.weather.gov/gridpoints/MKX/88,63/forecast')
  // in a production application we'd want to do some sort
  // of error handling of this request
  .then(res => res.json())
  .then((fullData) => {
    // We're going to throw away all the weather data
    // except today, tonight, and, tomorrow (the first
    // three nodes in the periods array)
    const data = {
      ...fullData,
      properties: {
        periods: fullData.properties.periods.slice(0, 2)
      }
    }

    // Evaluate all the rules in our object using data and
    // add a node with a key equal to the rule name, and value
    // equal to the evaluated value of the rule when run
    // against our data object
    const result = {}
    Object.keys(rules).forEach((key) => {
      result[key] = rules[key](data)
    })

    // return our result
    return result
  })
```

When this is run we get a JSON response similar to this.

```
{
  HOT_TODAY: false,
  COLD_TODAY: true,
  MODERATE_TODAY: false,
  GETTING_COLDER: true
}
```

This is really just scratching the surface of what regent can do. If you have any questions please visit https://github.com/northwesternmutual/regent.

Regent is an open source project from Northwestern Mutual.
