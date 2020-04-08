const { Schema, model, Types } = require('mongoose');

const HTSchema = new Schema(
    {
        humidity: {
            type: Number,
            required: true,
        },
        temperature: {
            type: Number,
            required: true,
        },
        timestamp: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
        versionKey: false,
    },
);

module.exports = model('HT', HTSchema);
