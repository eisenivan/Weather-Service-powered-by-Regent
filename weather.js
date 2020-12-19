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
