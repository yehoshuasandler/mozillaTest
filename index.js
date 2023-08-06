/**
 * Finds all of the product element on the search result page.
 * @returns {Element[]} productElements
 */
const getProductElementsFromPage = () => {
  const productIdQuerySelector = '[data-asin]:not([data-asin=""])'
  const productElementNodeList = document.querySelectorAll(productIdQuerySelector)
  const productElements = Array.from(productElementNodeList)
  return productElements
}

/**
 * @param {string} dateString In the format of "Mon, Aug 2"
 * @returns {InstanceType<typeof Date> | null} date
 */
const parseDeliveryDateString = (dateString) => {
  const trimmedDateString = dateString.trim()

  const basicPattern = /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}( - [A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2})?$/
  if (!basicPattern.test(trimmedDateString)) return null

  const dateParts = trimmedDateString.split(', ')
  const [month, day] = dateParts[1].split(' ')
  const year = new Date().getFullYear()
  const date = new Date(`${month} ${day}, ${year}`)

  if (date.toString() === 'Invalid Date') return null

  return date
}

/**
 * Returns the earliest delivery date provided on the product element.
 * @param {Element} productElement 
 * @returns {InstanceType<typeof Date> | null} deliveryDate
 */
const getDeliveryDateFromElement = productElement => {
  const deliveryDateElementNodeList = productElement.querySelectorAll('div.sg-row div.a-row span.a-color-base.a-text-bold')
  const deliveryDateElements = Array.from(deliveryDateElementNodeList)
  const deliveryDates = deliveryDateElements
    .map(d => d.innerText)
    .filter(d => d)
    .map(parseDeliveryDateString)
    .filter(d => d)

  if (deliveryDates.length === 0) return null

  const deliveryDate = deliveryDates.reduce((earliestDate, date) => {
    return earliestDate.getTime() < date.getTime() ? earliestDate : date
  })

  return deliveryDate
}

/**
 * Does not account for currency.
 * @param {Element} productElement 
 * @returns {number | null} price
 */
const getPriceFromElement = productElement => {
  const priceWholeElement = productElement.querySelector('.a-price-whole')
  const priceFractionElement = productElement.querySelector('.a-price-fraction')
  const totalPriceAsString = priceWholeElement && priceFractionElement ? `${priceWholeElement.innerText}${priceFractionElement.innerText}` : null
  const totalPrice = totalPriceAsString ? parseFloat(totalPriceAsString) : null
  return totalPrice
}

/**
 * Uses the `data-asin` attribute to construct the url.
 * @param {Element} productElement 
 * @returns {string | null} url
 */
const getProductUrlFromElement = productElement => {
  const productId = productElement.getAttribute('data-asin')
  if (!productId) return null
  else return `https://www.amazon.com/dp/${productId}`
}

/**
 * Gets the rating from the product element.
 * Does not account for how many ratings there are.
 * @param {Element} productElement 
 * @returns {number | null} rating
 */
const getRatingFromElement = productElement => {
  const ratingElementQuerySelector = 'span.a-icon-alt'
  const ratingElement = productElement.querySelector(ratingElementQuerySelector)
  const ratingString = ratingElement ? ratingElement.innerText : null
  if (!ratingString) return null

  const basicPattern = /^(\d\.\d|\d) out of 5 stars$/g
  if (!basicPattern.test(ratingString)) return null

  const ratingParts = ratingString.split(' ')
  if (!ratingParts || !ratingParts.length) return null

  const rating = parseFloat(ratingParts[0])
  if (isNaN(rating)) return null
  return rating
}

/**
 * Gets the rating count from the product element.
 * @param {Element} productElement 
 * @returns {number | null} ratingCount
 */
const getRatingCountFromElement = productElement => {
  const ratingCountElementQuerySelector = 'span.a-size-base.s-underline-text'
  const ratingCountElement = productElement.querySelector(ratingCountElementQuerySelector)
  const ratingCountString = ratingCountElement ? ratingCountElement.innerText : null
  if (!ratingCountString) return null

  const normalizedRatingCountString = ratingCountString.replace(/,/g, '')
  const ratingCount = parseInt(normalizedRatingCountString)

  if (isNaN(ratingCount)) return null
  return ratingCount
}

/**
 * @typedef {object} Product
 * @property {string | null} url
 * @property {number | null} price
 * @property {InstanceType<typeof Date> | null} deliveryDate
 * @property {number | null} rating
 * @property {number | null} ratingCount
 */

/**
 * Parses the product elements to get the product details.
 * Some properties in individual products may not be retrievable.
 * @param {Element} productElements 
 * @returns {Product[]} productDetails
 */
const getProductDetailsFromElements = productElements => {
  const productDetails = productElements.map(element => {
    const url = getProductUrlFromElement(element)
    const price = getPriceFromElement(element)
    const deliveryDate = getDeliveryDateFromElement(element)
    const rating = getRatingFromElement(element)
    const ratingCount = getRatingCountFromElement(element)
    return { url, price, deliveryDate, rating, ratingCount }
  })

  return productDetails
}

/**
 * Gets the earliest Date from an array of `Products`
 * @param {Product[]} productDetails 
 * @returns {InstanceType<typeof Date> | null} earliestDate
 */
const getEarliestDeliveryDateOfProducts = (productDetails) => {
  const deliveryDates = productDetails.filter(p => p.deliveryDate).map(p => p.deliveryDate)

  if (!deliveryDates.length) return null

  const earliestDate = deliveryDates.reduce((earliestDate, date) => {
    if (earliestDate > date) return date
    else return earliestDate
  }, deliveryDates[0])

  return earliestDate
}

/**
 * Finds the most recent deliveryDate among the products
 * and returns an array of products matching that date.
 * @param {Product[]} productDetails
 * @returns {Product[]} fastestDeliveredProducts
 */
const getFastestDeliveredProducts = (productDetails) => {
  const earliestDate = getEarliestDeliveryDateOfProducts(productDetails)
  if (!earliestDate) return []

  const productsOfEarliestDate = productDetails
    .filter(p => p.deliveryDate)
    .filter(p => p.deliveryDate.getTime() === earliestDate.getTime())
  return productsOfEarliestDate
}

/**
 * Gets the lowest possible price from an array of `Products`.
 * Does not account for currency differences in value.
 * @param {Product[]} productDetails 
 * @returns {number | null} lowestPrice
 */
const getLowestPriceOfProducts = (productDetails) => {
  const prices = productDetails.filter(p => p.price).map(p => p.price)

  if (!prices.length) return null

  const lowestPrice = prices.reduce((lowestPrice, price) => {
    if (lowestPrice > price) return price
    else return lowestPrice
  }, prices[0])

  return lowestPrice
}

/**
 * Finds the lowest possible price of `Product`s and returns
 * an array of all the `Product`s with that price
 * @param {Product[]} productDetails 
 * @returns {Product[]} lowestPricedProducts
 */
const getProductsOfLowestPrice = (productDetails) => {
  const lowestPrice = getLowestPriceOfProducts(productDetails)
  const productsOfLowestPrice = productDetails.filter(p => (p.price && p.price === lowestPrice))
  return productsOfLowestPrice
}

/**
 * Finds the highest possible rating value of the `Product`s provided.
 * Does not take amount of ratings into account.
 * @param {Product[]} productDetails 
 * @returns {number | null} highestRating
 */
const getHighestRatingOfProducts = (productDetails) => {
  const ratings = productDetails.filter(p => p.rating).map(p => p.rating)

  if (!ratings.length) return null

  const highestRating = ratings.reduce((highestRating, rating) => {
    if (highestRating < rating) return rating
    else return highestRating
  }, ratings[0])

  return highestRating
}

/**
 * Finds the highest possible rating of the `Product`s provided
 * and returns an array of all the `Product`s that rating.
 * @param {Product[]} productDetails 
 * @returns {Product[]} productsOfHighestRating
 */
const getProductsOfHighestRating = (productDetails) => {
  const highestRating = getHighestRatingOfProducts(productDetails)

  if (!highestRating) return []

  const productsOfHighestRating = productDetails.filter(p => (p.rating && p.rating === highestRating))
  return productsOfHighestRating
}


const OptimizationTypes = {
  PRICE: 'PRICE',
  DELIVERY_DATE: 'DELIVERY_DATE',
  RATING: 'RATING',
}

const Optimizations = {
  PRICE: getProductsOfLowestPrice,
  DELIVERY_DATE: getFastestDeliveredProducts,
  RATING: getProductsOfHighestRating
}

/**
 * If many `Products` have equating criteria then `ratingCount` will be used as a tie breaker.
 * If magically there is an exact match of `ratingCount`, the first `Product` in the array will
 * be chosen indiscriminately.
 * @param {Product} productDetails 
 * @param {ValueOf<keyof Optimizations>[]} optimizationTypes Can pass in 1 to 3 cascading types
 * @returns {Product | null} `optimizedProduct` prioritized for the cascading order of `optimizationTypes`
 */
const getProductOptimizedFor = (productDetails, optimizationTypes) => {
  let optimizedProducts = productDetails

  for (let i = 0; i < optimizationTypes.length; i++) {
    const type = optimizationTypes[i];
    if (!Object.keys(Optimizations).includes(type)) return null

    let tempOptimizedProducts = Optimizations[type](optimizedProducts)
    if (!tempOptimizedProducts.length) continue
    else optimizedProducts = tempOptimizedProducts
  }

  if (optimizedProducts.length > 1) {
    const tempOptimizedProducts = getProductsOfHighestRating(optimizedProducts)
    if (tempOptimizedProducts.length) optimizedProducts = tempOptimizedProducts
  }

  return optimizedProducts[0]
}

/**
 * @typedef {Object} OptimalProductUrls
 * @prop {string} cheapest
 * @prop {string} fastestDelivery
 * @prop {string} highestRating
 */

/**
 * When run on an Amazon search results page, this
 * function will find the URLs for three products,
 * optimized for their respective properties.
 * 
 * Each product is optimized, in a cascading order,
 * for `price`, `rating`,and `delivery speed`
 * @returns {OptimalProductUrls} optimalProductUrls
 */
const main = () => {
  const productElements = getProductElementsFromPage()
  const products = getProductDetailsFromElements(productElements)

  const { PRICE, DELIVERY_DATE, RATING } = OptimizationTypes
  const productsOptimizedForDelivery = getProductOptimizedFor(products, [DELIVERY_DATE, PRICE, RATING])
  const productsOptimizedForPrice = getProductOptimizedFor(products, [PRICE, RATING, DELIVERY_DATE])
  const productsOptimizedForRating = getProductOptimizedFor(products, [RATING, PRICE, DELIVERY_DATE])

  const optimalProductUrls = {
    fastestDelivery: productsOptimizedForDelivery?.url,
    cheapest: productsOptimizedForPrice?.url,
    highestRating: productsOptimizedForRating?.url,
  }

  return optimalProductUrls
}

main()
