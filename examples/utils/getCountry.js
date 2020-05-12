const axios = require("axios");
import { availableCountries } from "../../data/availableCountries";

export const getCountry = async (lat, lng) => {
  console.log("getCountry lat lng", lat, lng);
  try {
    axios
      .post(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      )
      .then(({ data }) => {
        console.log("country is ", data.address.country_code.toUpperCase());
        return data.address.country_code.toUpperCase();
      });
  } catch (e) {
    console.log("Error get country zone", e);
    return "";
  }
};

export const isCountryAvailable = async (lat, lng) => {
  try {
    axios
      .post(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      )
      .then(({ data }) => {
        console.log(
          " isCountryAvailable country is ",
          data.address.country_code.toUpperCase()
        );

        const isAvailable = availableCountries.includes(
          data.address.country_code.toUpperCase()
        );
        return isAvailable;
      });
  } catch (e) {
    console.log("Error get isCountryAvailable zone", e);
    return false;
  }
};
