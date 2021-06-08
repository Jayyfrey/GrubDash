const path = require("path");
// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));
// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// Simple check if order exists
function orderExists (request, response, next) {
    const { orderId } = request.params;
    const foundOrder = orders.find((order) => order.id === orderId);
    if (foundOrder === undefined) {
        return next ({
            status: 404,
            message: `Order id not found ${orderId}`,
        });
    };
    response.locals.order = foundOrder;
    next();
}

// reporting all errors at once, as opposed to adding logic for special cases
function orderValidation (request, response, next) {
    const newOrder = request.body.data;
    const requestKeys = Object.keys(newOrder);
    const listOfOrdersKeys = ["deliverTo", "mobileNumber", "dishes"];
    const missingData = [];
    const emptyData = [];
    const errorMessage = [];
    // check for missing compulsory attributes
    for (let i = 0; i < listOfOrdersKeys.length; i++) {
        if (!requestKeys.includes(listOfOrdersKeys[i])) {
            missingData.push(listOfOrdersKeys[i]);
        }
    }
    // check for empty compulsory attributes
    for (let i = 0; i < listOfOrdersKeys.length; i ++) {
        const currentKeyValue = newOrder[listOfOrdersKeys[i]];
        if (requestKeys.includes(listOfOrdersKeys[i]) && (currentKeyValue == "" || currentKeyValue === undefined)) {
            emptyData.push(listOfOrdersKeys[i]);
        }
    }
    // building an array that contains "missing data", "empty data" and "missing dishes" validation errors
    if (missingData.length > 0) {errorMessage.push(`The following data is missing: ${missingData.join(",")}!`)}
    if (emptyData.length > 0) {errorMessage.push(`The following data should not be empty: ${emptyData.join(",")}!`)};
    if (!Array.isArray(newOrder.dishes)) {errorMessage.push(`Order must include at least one dish`)};

    if (errorMessage.length > 0) {
        return next ({
            status: 400,
            message: `${errorMessage.join("\n")}`
        })
    }
    // validation specific to the "dishes" key
    if (newOrder.dishes !== undefined || newOrder.dishes.length > 0) {
        newOrder.dishes.forEach((dish, index) => {
            if (dish.quantity === undefined || dish.quantity === null || dish.quantity == 0 || !Number.isInteger(dish.quantity)) {
                return next ({
                    status: 400,
                    message: `Dish ${index} must have a quantity that is an integer greater than 0`
                })
            }
        })
    }
    next();
}

// validation specific to "updateOrder" function 
function updateOrderValidation (request, response, next) {
    const { orderId } = request.params;
    const validStatus = ["pending", "preparing", "out-for-deliver", "delivered"];
    let newOrder = request.body.data;
    if (newOrder["status"] === undefined 
        || newOrder["status"] === null 
        || newOrder["status"] == ""
        || !validStatus.includes(newOrder["status"])) {
        return next ({
            status: 400,
            message: "Order must have a status of pending, preparing, out-for-delivery, delivered",
        })
    }
    // if order id is not defined / null / "" then take it from the URL parameters
    if (newOrder["id"] === undefined || newOrder["id"] === null || newOrder["id"] == "") {
        newOrder["id"] = orderId;
    }
    // 
    if (newOrder.id != orderId) {
        return next({
            status: 400,
            message: `Order id ${newOrder.id} does not match the route link!`
        })
    }
    next();
}

//LIST
function listOrders (request, response, next) {
    response.json({ data: orders });
}

//CREATE
function createOrder (request, response, next) {
    let newOrder = request.body.data;
    newOrder.id = nextId();
    orders.push(newOrder);
    response.status(201).json({ data: newOrder });
}


//READ
function readOrder (request, response, next) {
    const { orderId } = request.params;
    response.json({ data: response.locals.order });
}

//UPDATE
function updateOrder (request, response, next) {
    const { orderId } = request.params;
    let newOrder = request.body.data;
    if (newOrder["id"] === undefined || newOrder["id"] === null || newOrder["id"] == "") {
        newOrder["id"] = orderId;
    }
    response.json({ data: newOrder});
}


//DELETE
function deleteOrder (request, response, next) {
    const { orderId } = request.params;
    if (response.locals.order.status !== "pending") {
        return next({
            status: 400,
            message: `Only pending order can be removed!`
        })
    }
    const index = orders.findIndex((order) => order.id === Number(orderId))
    orders.splice(index, 1)
    response.status(204).json()
    
}

module.exports = {
    readOrder: [orderExists, readOrder],
    updateOrder: [orderExists, orderValidation, updateOrderValidation, updateOrder],
    listOrders,
    createOrder: [orderValidation, createOrder],
    deleteOrder: [orderExists, deleteOrder]
};