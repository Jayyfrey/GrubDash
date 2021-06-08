const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

function dishExists (request, response, next) {
    const { dishId } = request.params;
    const foundDish = dishes.find((dish) => dish.id === dishId);
    if (foundDish === undefined) {
        return next ({
            status: 404,
            message: `Dish id not found ${dishId}`,
        });
    };
    response.locals.dish = foundDish;
    next();
}

// reporting all errors at once, as opposed to adding logic for special cases
function dishValidation (request, response, next) {
    const newDish = request.body.data;
    const requestKeys = Object.keys(newDish);
    const listOfDishesKeys = ["name", "description", "price", "image_url"];
    const missingData = [];
    const emptyData = [];
    const errorMessage = [];
    // check for missing compulsory attributes
    for (let i = 0; i < listOfDishesKeys.length; i++) {
        if (!requestKeys.includes(listOfDishesKeys[i])) {
            missingData.push(listOfDishesKeys[i]);
        }
    }
    // check for empty compulsory attributes
    for (let i = 0; i < listOfDishesKeys.length; i ++) {
        const currentKeyValue = newDish[listOfDishesKeys[i]];
        if (requestKeys.includes(listOfDishesKeys[i]) && (currentKeyValue == "" || currentKeyValue === undefined)) {
            emptyData.push(listOfDishesKeys[i]);
        }
    }
    // building an array that contains "missing data" and "empty data" validation errors
    if (missingData.length > 0) {errorMessage.push(`The following data is missing: ${missingData.join(",")}!`)}
    if (emptyData.length > 0) {errorMessage.push(`The following data should not be empty: ${emptyData.join(",")}!`)}
    // validation specific to the "price" key
    if (newDish.price !== undefined) {
        if (typeof newDish.price != "number") {errorMessage.push(`Dish price must be a number!`)};
        if (newDish.price == 0) {errorMessage.push(`Dish price can't be equal to 0!`)};
        if (newDish.price < 0) {errorMessage.push(`Dish price can't be less than 0!`)};
    }
    if (errorMessage.length > 0) {
        return next ({
            status: 400,
            message: `${errorMessage.join("\n")}`
        })
    }
    next();
}

function updateDishValidation (request, response, next) {
    const { dishId } = request.params;
    const newDish = request.body.data;
    // if request does not contain the id - take it from the URL parameter
    if (newDish["id"] === undefined || newDish["id"] === null || newDish["id"] == "") {
        newDish["id"] = dishId;
    }
    // report an error if IDs are not matching
    if (newDish.id != dishId) {
        return next({
            status: 400,
            message: `Dish id ${newDish.id} does not match the route link!`
        })
    }
    next();
}

function readDish (request, response, next) {
    const { dishId } = request.params;
    const foundDish = dishes.find((dish) => dish.id === dishId);
    response.json({ data: foundDish });
}

function updateDish (request, response, next) {
    const { dishId } = request.params;
    const newDish = request.body.data;
    for (dish of dishes) {
        if (dish.id == newDish.id) {
            Object.assign(dish, newDish);
        }
    }
    response.json({ data: newDish })
}

function listDishes (request, response, next) {
    response.json({ data: dishes });
}

function createDish (request, response, next) {
    let newDish = request.body.data;
    newDish.id = nextId();
    dishes.push(newDish);
    response.status(201).json({ data: newDish });
}

module.exports = {
    readDish: [dishExists, readDish],
    updateDish: [dishExists, dishValidation, updateDishValidation, updateDish],
    listDishes,
    createDish: [dishValidation, createDish]
};