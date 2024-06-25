const mapsApiKey = GOOGLE_MAPS_API_KEY;

// Get the google API key
document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&callback=initMap`;
    script.async = true;
    document.body.appendChild(script);
});

let map;

let currentMarker = null;
let currentCircle = null;
let service;

let selectedLocation;
let radius = 500;
let previousSelectedLocation;
let previousRadius = 0;

let minimum_rating = 3.5;
let previousMinimumRating;

let orderBy = 'rating';

let restaurantMarkers = [];

let restaurantResults;
const tableBody = document.querySelector('#results tbody');

let highlightedRestaurantId;

let defaultIcon;
let highlightedIcon;

async function initMap() {
    const { Map } = await google.maps.importLibrary('maps');
    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
    // const { Circle } = await google.maps.importLibrary('maps')

    map = new Map(document.getElementById('map'), {
        mapId: '608aeffcc45faef9',
        center: { lat: 48.8575, lng: 2.3514 },
        zoom: 12,
        streetViewControl: false,
        mapTypeControl: false,  
        fullscreenControl: false,
    });

    service = new google.maps.places.PlacesService(map);

    defaultIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: 'rgba(0, 0, 255, 0.2)',
        fillOpacity: 0.4,
        scale: 10, 
        strokeColor: 'blue',
        strokeWeight: 1
    };

    highlightedIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: 'blue',
        fillOpacity: 1, 
        scale: 10, 
        strokeColor: 'blue',
        strokeWeight: 1
    };

    map.addListener('click', (event) => {

        selectedLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        };

        addMarker(selectedLocation);
        addCircle(selectedLocation, radius);

        // Update coordinates display if user clicks on map
        latitudeInput.value = selectedLocation.lat;
        longitudeInput.value = selectedLocation.lng;
    });
}

let latitudeInput = document.querySelector('#currentLatitude');
let longitudeInput = document.querySelector('#currentLongitude');
let previousLatitudeInput = null;
let previousLongitudeInput = null;

function submitCoordinateInputs() {

    // Check values are not empty
    if (!latitudeInput.value || !longitudeInput.value) {
        return;
    }

    // Check if the values have changed
    if (latitudeInput.value == previousLatitudeInput && longitudeInput.value == previousLongitudeInput) {
        return;
    }

    // Handle non-numbers and numbers that are out of range for the coordinate inputs
    if (isNaN(latitudeInput.value) || isNaN(longitudeInput.value) || 
    (-80 > latitudeInput.value || 80 < latitudeInput.value) || 
    (-180 > longitudeInput.value || 180 < longitudeInput.value)) {
        alert('Invalid coordinates.');
        return;
    }
   
    // Update the previous input values
    previousLatitudeInput = latitudeInput.value;
    previousLongitudeInput = longitudeInput.value;

    // Update selected location if coordinate inputs are changed
    selectedLocation = {
        lat: parseFloat(latitudeInput.value),
        lng: parseFloat(longitudeInput.value)
    };
    // Change view to selected the location
    map.setCenter(selectedLocation);

    addMarker(selectedLocation);
    addCircle(selectedLocation, radius);
}


let searchButton = document.querySelector('#search');
searchButton.addEventListener('click', () => {

    submitCoordinateInputs();

    if (currentMarker) {
        // Execute if it is a first search
        if (!previousSelectedLocation) {
            getRestaurants(service, selectedLocation, radius);

        } else {
            // Execute if it is the same location, radius and minimum rating as the previous search
            if ((selectedLocation.lat == previousSelectedLocation.lat) 
                && (selectedLocation.lng == previousSelectedLocation.lng)
                && (radius == previousRadius)
                && (minimumRating == previousMinimumRating)) {
                alert('You have already searched for this');

            } else {
                // Execute if it is a new search
                getRestaurants(service, selectedLocation, radius);
                highlightedRestaurantId = null;
            }        
        }
        // Store value of the previous location
        previousSelectedLocation = selectedLocation;

        // Store value of the previous minimum rating
        previousMinimumRating = minimumRating;

    } else {
        alert('Select a location')
    }
    });


function addMarker(location, AdvancedMarkerElement) {
    if (currentMarker) {
        currentMarker.setMap(null);
    }

    currentMarker = new google.maps.marker.AdvancedMarkerElement({
        position: location,
        map: map,
        title: 'Selected Location'
    });
}

function addCircle(location, radius) {
    if (currentCircle) {
        currentCircle.setMap(null);
    }

    currentCircle = new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.1,
        map: map,
        center: location,
        radius: radius
    });
}

let radiusSlider = document.querySelector('#radiusSlider');
let radiusValue = document.querySelector('#radiusValue');
radiusSlider.addEventListener('input', () => {
    radius = parseInt(radiusSlider.value)
    radiusValue.textContent = radius;

    if (currentCircle) {
        currentCircle.setRadius(radius)
    }
});

let locateMeButton = document.querySelector('#locateMe');
locateMeButton.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            selectedLocation = {
                lat: latitude,
                lng: longitude
            }

            const { AdvancedMarkerElement } = google.maps.importLibrary('marker');

            map.panTo(selectedLocation);
            addMarker(selectedLocation, AdvancedMarkerElement);
            addCircle(selectedLocation, radius);
          },
          (error) => {
            console.error('Error Code = ' + error.code + ' - ' + error.message);
          }
        );
      } 
    else {
        console.error('Geolocation is not supported by this browser.');
    }
});

// Order results by specified field
let OrderByButtons = document.querySelectorAll('.order');
OrderByButtons.forEach(button => {
    button.addEventListener('click', event => {
        if (event.target.textContent == 'Rating') {
            orderBy = 'rating';
        } else if (event.target.textContent == 'Distance') {
            orderBy = 'distance';
        } else if (event.target.textContent == 'Number of ratings') {
            orderBy = 'user_ratings_total';
        } else if (event.target.textContent == 'Price level') {
            orderBy = 'price_level';
        }
        
        // highlight clicked OrderBy button
        OrderByButtons.forEach((b) => {
            if (b.style.backgroundColor == 'yellow') {
                b.style.backgroundColor = 'white';
            }
        });

        button.style.backgroundColor = 'yellow';

        displayResultsTable(restaurantResults, orderBy, minimum_rating);

        // Track the highlighted row when the selectOrderBy button is changed
        const row = document.querySelector(highlightedRestaurantId);
        if (row) {
            row.style.backgroundColor = 'yellow';
        }
    });    
});

// Set up filter by minimum rating
let MinimumRatingSelector = document.querySelector('#minimumRating');
document.addEventListener('DOMContentLoaded', () => {
    for (let i = 50; i >= 30; i--) {
        let option = document.createElement('option');
        option.value = (i / 10).toFixed(1);
        option.text = (i / 10).toFixed(1);

        if (option.value === '3.5') {
            option.selected = true;
        }
    
        MinimumRatingSelector.appendChild(option);
    }
});

MinimumRatingSelector.addEventListener('change', () => {
    minimum_rating = MinimumRatingSelector.value;
});

function getRestaurants(service, location, radius) {
    // Define the search request
    const request = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: radius,
        type: ['restaurant']
    };

    // Use the nearbySearch method to search for restaurants
    service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {

            for (let i = 0; i < results.length; i++) {
                const place = results[i];
                
                // Get distance from the selected location to the restaurants
                const placeLocation = new google.maps.LatLng(
                    place.geometry.location.lat(),
                    place.geometry.location.lng()
                );
        
                const selectedLatLng = new google.maps.LatLng(
                    selectedLocation.lat,
                    selectedLocation.lng
                );
                
                const distance = google.maps.geometry.spherical.computeDistanceBetween(selectedLatLng, placeLocation);
                place.distance = distance * -1;

                if (!place.price_level) {
                    place.price_level = 0;
                }   
            };

            restaurantResults = results;

            displayResultsTable(restaurantResults, orderBy, minimum_rating);
            displayResultsMap(restaurantResults, minimum_rating)
            
            // Store value of the previous radius
            previousRadius = radius;

        } else { // Handle if there are no results in the area
            
            // Clear any previous results
            while (tableBody.firstChild) {
                tableBody.removeChild(tableBody.firstChild);
            }

            if (status == 'ZERO_RESULTS') {
                console.error('Places service failed due to: ' + status);
            }
        }
    });
}

function displayResultsTable(results, orderBy, minimum_rating) {
    // Clear any previous results
    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }

    // Order results based on the user's input, orderBy
    results.sort((a, b) => b[orderBy] - a[orderBy]);

    // display the ordered results
    results.forEach((restaurant) => {
        if (restaurant.rating >= minimum_rating) {

            const row = tableBody.insertRow();
            row.id = restaurant.place_id;

            const cellName = row.insertCell(0);
            const cellRating = row.insertCell(1);
            const cellTotalRatings = row.insertCell(2);
            const cellPriceLevel = row.insertCell(3);
            const cellUrl = row.insertCell(4);

            cellName.textContent = restaurant.name;
            cellRating.textContent = restaurant.rating;
            cellTotalRatings.textContent = restaurant.user_ratings_total;

            if (restaurant.price_level == 0) {
                cellPriceLevel.textContent = 'N/A';
            }
            else {
                cellPriceLevel.textContent = restaurant.price_level;
            }

            let restaurantUrl = `https://www.google.com/maps/place/?q=place_id:${restaurant.place_id}`; 

            cellUrl.innerHTML = `<a href="${restaurantUrl}" target="_blank">Google Maps</a>`;

            // Highlight restaurant row and marker when row is clicked
            row.addEventListener('click', () => {
                // Reset all rows' background color
                document.querySelectorAll('#results tbody tr').forEach(row => {
                    row.style.backgroundColor = '';
                });
                // Highlight the clicked row
                row.style.backgroundColor = 'yellow';

                // Highlight the corresponding marker
                restaurantMarkers.forEach((marker) => {
                if (marker.getTitle() === restaurant.name) {
                    marker.setIcon(highlightedIcon);
                } else {
                    marker.setIcon(defaultIcon);
                }
                });
                highlightedRestaurantId = `#${restaurant.place_id}`;
            });
        }
    });
}

function displayResultsMap(results, minimum_rating) {

    clearRestaurantMarkers()

    results.forEach((restaurant) => {
        if (restaurant.rating >= minimum_rating) {
            // Add restaurantMarkers
            const lat = restaurant.geometry.location.lat();
            const lng = restaurant.geometry.location.lng();

            // Add a marker for each restaurant
            const marker = new google.maps.Marker({
                position: { lat: lat, lng: lng },
                map: map,
                title: restaurant.name,
                icon: defaultIcon,
                place_id: restaurant.place_id
            });

            // Store marker in markers array
            restaurantMarkers.push(marker);
        }
    });
    highlightRestaurant();
}

function clearRestaurantMarkers() {
    restaurantMarkers.forEach(marker => {
        marker.setMap(null);
    });
    restaurantMarkers = [];
}

function highlightRestaurant() {
    restaurantMarkers.forEach((restaurant) => {
        restaurant.addListener('click', () => {
            // Reset previously highlighted marker
            restaurantMarkers.forEach((marker) => {
                if (marker.getIcon().fillColor === highlightedIcon.fillColor) {
                    marker.setIcon(defaultIcon);
                }
            });

            restaurant.setIcon(highlightedIcon);

            // Highlight the corresponding table row
            document.querySelectorAll('#results tbody tr').forEach(row => {
                row.style.backgroundColor = '';
            });
            
            highlightedRestaurantId = `#${restaurant.place_id}`;

            const row = document.querySelector(highlightedRestaurantId);
            if (row) {
                row.style.backgroundColor = 'yellow';
                row.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}


// Initialize the map on window load
window.onload = initMap;