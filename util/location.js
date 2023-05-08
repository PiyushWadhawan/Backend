const axios = require('axios');
 
const HttpError = require('../models/http-error');
 
const getCoordsForAddress = async (address) => {
    const response = await axios.get(
        `${process.env.LOCATION_API}`,
    {
        params: {
            f: 'json',
            singleLine: address,
            outFields: 'Match_addr,Addr_type'
        }
    }
    );
 
    const data = response.data;
 
    // Check if no matches were found
    if (!data || data.candidates.length === 0) {
        const error = new HttpError(
        'Could not find location for the specified address',
        422
        );
        throw error;
    }
    
    // Get Latitude
    const lat = response.data.candidates[0].location.y;
    // Get Longitude
    const lng = response.data.candidates[0].location.x;
    
    return {
        lat,
        lng
    };
};
 
module.exports = getCoordsForAddress;