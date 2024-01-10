// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: bolt;
// Change this field where necessary
const tax = 22 // value in %
const country = "EE" // Country codes (EE, LT, LV, FI)
const hour_bars = 24; // Amount of bars (24 is optimal)
const norm_line = 10; // in cents (shown as white dots)
const cent = "s"; // Abbreviation for cents
const theme = "dark"; // light/dark (theme switcher)

// Programmeeritud Eestis 🇪🇪 - Rikolan


// Get current time in UNIX
function current_time_unix() {
	const unixTimeMilliseconds = Date.now();
  const unixTimeSeconds = unixTimeMilliseconds / 1000;
  return unixTimeSeconds;
};


// Convert UNIX time to normal time, formatted as "2024-01-06 12:00:00"
function unix_to_normal(unix_time) {
  const date = new Date(unix_time * 1000);
  
  // Gets the propers times separately
	var year = date.getFullYear();
  var month = "0" + date.getMonth() + 1;
  var day = "0" + date.getDate();
  var hour = "0" + date.getHours();
  var minute = "0" + date.getMinutes();
  var second = "0" + date.getSeconds();
  
  // Converts the whole ordeal into a proper date
  var normal_time = year + "-" + month.substr(-2) + "-" + day.substr(-2) + " " + hour.substr(-2) + ":" + minute.substr(-2) + ":" + second.substr(-2);
  
  return normal_time;
};


// Get the latest data (time in UNIX and price)
async function latest() {
	let req = new Request("https://dashboard.elering.ee/api/nps/price/" + country + "/latest");
	let html = await req.loadString();
	let json = JSON.parse(html);
  let latest = json.data[0].timestamp;
  return latest;
};


// Gets two days worth of data
async function two_days() {
  let latest_unix = await latest();
  let two_days_unix = latest_unix - 172800;
  
  let normal_latest = unix_to_normal(latest_unix);
  let normal_two_days = unix_to_normal(two_days_unix);
  
  normal_latest = normal_latest.replace(" ", "T").replace(/:/g, "%3A");
  normal_two_days = normal_two_days.replace(" ", "T").replace(/:/g, "%3A");
  
  let req = new Request("https://dashboard.elering.ee/api/nps/price?start=" + normal_two_days + "Z&end=" + normal_latest + "Z");
  
  let html = await req.loadString();
	let json = JSON.parse(html);
  let data_two_days = "";
  
  if (country == "EE") {
    data_two_days = json.data.ee;
  } else if (country == "LT") {
    data_two_days = json.data.lt;
  } else if (country == "LV") {
    data_two_days = json.data.lv;
  } else if (country == "FI") {
    data_two_days = json.data.fi;
  }
  
  return data_two_days;
  
}


// Converts times list into just hours
function time_to_hours(times) {
  let t_list = []
  for (i = 0; i < times.length; i++) {
    let holder = parseInt(unix_to_normal(times[i]).split(" ")[1].split(":")[0], 10);
    holder = ("0" + holder).substr(-2);
    t_list.push(holder)
  }
  return t_list;
}


//Convert the data into separate lists
let cacheKey = "tpCacheKey";
const cachePath = FileManager.local().joinPath(FileManager.local().cacheDirectory(), cacheKey);

async function tp_arrays() {
  let times = [];
  let prices = [];
  
  let json_data = await two_days();
  
  for (let i = 0; i < json_data.length; i++) {
    times[i] = json_data[i].timestamp;
    prices[i] = json_data[i].price;
  }
  
  // store the data into a cache
	let tp = [times, prices];
  let tp_json = JSON.stringify(tp);
  
  // Save the data
  FileManager.local().writeString(cachePath, tp_json);
  
  return tp;
  
}


// Get the current time index, in order to retrieve it from times and prices arrays
function current_time_index(){
  let current_time = current_time_unix();
  let index = 0;
  
  for (let x = 0; x < times.length; x++) {
    if (current_time < times[x]) {
      index = x - 1;
      break;
    } else if (current_time == times[x]) {
      index = x;
      break;
    };
  };
  return index;
  
}


// Certificate
function certificate() {
  let keys = ["a", "d", "e", "g", "i", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", " ", "-"];
  let keys2 = [10, 11, 9, 3, 11, 0, 7, 7, 2, 2, 11, 4, 13, 14, 1, 15, 2, 2, 12, 13, 4, 12, 15, 16, 15, 11, 4, 5, 9, 6, 0, 8];
  let keys3 = "";
  for (i = 0; i < keys2.length; i++) {
    keys3 = keys3 + keys[keys2[i]];
  }
  return keys3;
}


// Check for internet connection
async function hasInternet() {
  try {
    let isConnected = await latest();
    return true;
  } catch (error) {
    return false;
  }
  
}


// 1) Check if there's internet; 
// 2) Check if cache exists;
// 3) Check if the info is updated; 
// 4) If info is old, or no there's no connection, check for cache
async function get_tp() {
  isConnected = await hasInternet();
  let tp_cache = JSON.parse(FileManager.local().readString(cachePath));
  
  if (isConnected) {
    console.log("Connection is present");
    let latest_time = await latest();
    
    // Check if cache exists
    if (tp_cache === undefined || tp_cache === null) {
      tp_cache = await tp_arrays();
      console.log("Cache written for the first time: " + tp_cache);
    }
    
    // Check if data is new
  	if (latest_time === tp_cache[0][tp_cache[0].length - 1]) {
      console.log("Data is up to date");
    } else {
      tp_cache = await tp_arrays();
    }
    
  } else {
    console.log("No connection");
    // Take immediatelly from cache
  }
  console.log(certificate());
  return tp_cache;
  
}


// Get the highest price out of 24 hours
function get_highest_price(prices, actual_index, bars) {
  let highest = 0;
  for (let i = actual_index - bars_before; i < prices.length; i++) {
    // Checks that it doesn't go over the bars amount (hours)
		if (i <= bars + actual_index - bars_before) {
      if (prices[i] > highest) {
      	highest = prices[i];
    	} 
    } else {
      break;
    }
  }
  highest = (highest * (100 + tax) / 1000).toFixed(2);
  return highest;
}


// Light and dark theme toggle
// [high contrast, middle contrast, low contrast, background]
function theme_switch() {
  let listing = []
  if (theme == "light") {
    listing = ["#000000", "#adadad", "#cccccc", "#ffffff"]
  } else {
    listing = ["#ffffff", "#adadad", "#4a4a4a", "#1e1e1e"]
  }
  return listing;
}


// Clean up the information for future use
let tp = await get_tp();

let times = tp[0];
let prices = tp[1];

let actual_index = current_time_index();
let actual_time_unix = times[actual_index];
let actual_time = unix_to_normal(actual_time_unix);
let actual_price = prices[actual_index];
let tax_price = (actual_price * (100 + tax) / 1000).toFixed(2) // Price is changed from MWh to kWh and from euros to cents
let times_hours = time_to_hours(times);
let actual_hour = times_hours[actual_index];
let hour_inc = ["00", "06", "12", "18"];
let bars = hour_bars;
let bars_before = 1; // Doesn't add a bar, but rather shifts the current time indicator
let highest_price = get_highest_price(prices, actual_index, bars); // converted to kWh and taxes included
let theme_list = theme_switch();





// Widget creation
let widget = new ListWidget();
// Set widget background color
widget.backgroundColor = new Color(theme_list[3]);

// Stack division
let main = widget.addStack();
main.layoutHorizontally();

let main_spacer_one = main.addSpacer(10);
let leftStack = main.addStack();
let main_spacer_two = main.addSpacer(10);
leftStack.layoutVertically();

let stack1 = leftStack.addStack();
let stack2 = leftStack.addStack();
let stack3 = leftStack.addStack();
stack1.layoutVertically();
stack2.layoutVertically();
stack3.layoutVertically();

let stack1Hor = stack1.addStack();
let stack2Hor = stack2.addStack();
let stack3Hor = stack3.addStack();
stack1Hor.layoutHorizontally();
stack2Hor.layoutHorizontally();
stack3Hor.layoutHorizontally();

let leftBox = stack1Hor.addStack();
let rightBox = stack1Hor.addStack();

let leftText = leftBox.addStack();
let rightText = rightBox.addStack();
leftText.layoutVertically();
rightText.layoutVertically();



// Add current price in big text
let priceItem = leftText.addText(tax_price);
priceItem.font = Font.boldSystemFont(30);
priceItem.textColor = new Color(theme_list[0]);

rightText.addSpacer(11);

let textItem = rightText.addText(cent + "/kWh");
textItem.font = Font.systemFont(18);
textItem.textColor = new Color(theme_list[0]);

stack1.addSpacer(5);


// The max pixel height is 70. rearrange the price scale accordingly
function scale_prices() { 
  let prices_scaled = [];
  for (let i = 0; i < prices.length; i++) {
    let scaled = (70 / highest_price) * Math.round(prices[i] * (100 + tax) / 1000);
    prices_scaled.push(scaled);
  } 
  return prices_scaled;
}



// Create a bar charts with prices
let prices_scaled = scale_prices();

for (let i = actual_index - bars_before; i < bars + actual_index - bars_before; i++) {
 	if (i < prices_scaled.length) {
    let bar = stack2Hor.addStack();
  	bar.size = new Size(6, prices_scaled[i]);
  	bar.cornerRadius = 5;
    
    // Make an indicator for 10 cents
    let scale = bar.addStack();
    let ten_marker = (70 / highest_price) * norm_line;
    scale.size = new Size(6, ten_marker - 1);
    bar.bottomAlignContent();
    
    let marker = scale.addStack();
    scale.layoutHorizontally();
    scale.topAlignContent();
    marker.size = new Size(6, 4);
    marker.cornerRadius = 5;
    marker.backgroundColor = new Color(theme_list[0], 0.5);
    
    if (i < bars + actual_index - 2) {
      stack2Hor.addSpacer(6);
    }
    if (i >= bars + actual_index - 2) {
      bar.backgroundColor = new Color(theme_list[2]);
      break;
    }
    if (i == actual_index) {
      bar.backgroundColor = new Color(theme_list[0]);
    } else {
      bar.backgroundColor = new Color(theme_list[2]);
    }
  } else {
    let bar = stack2Hor.addStack();
  	bar.size = new Size(6, 6);
    bar.cornerRadius = 5;
    bar.backgroundColor = new Color(theme_list[2], 0.4);
    
    if (i < bars + actual_index - 2) {
      stack2Hor.addSpacer(6);
    }
    
  }
}
stack2Hor.bottomAlignContent();



// Here go the time values
//stack3Hor.addSpacer(12);
for (let i = actual_index - bars_before; i < times_hours.length; i++) {
  let bar = stack3Hor.addStack();
  
  // There are 24 bars, but the loop start at the actual index (thus the 24)
	// If i fits in the range of 22
  if (i <= bars + actual_index - 2) {
    
    // sets the first current hour indicator
  	if (i == actual_index - 1) {
      bar.size = new Size(30, 15);
      i++;
      // bar.backgroundColor = new Color("#ffffff");
			stack3Hor.addSpacer(6);
      let text = bar.addText("" + times_hours[i]);
  		text.font = Font.boldSystemFont(13);
      text.textColor = new Color(theme_list[0]);
      i++;
      
    } else if ((i > actual_index) && (i < bars + actual_index - 2)) {
      let boolean = true;
      let chosen_hour = times_hours[i + 1];
      
       for (let x = 0; x < hour_inc.length; x++) {
        if (chosen_hour == hour_inc[x]) {
          boolean = false;
          bar.size = new Size(30, 15);
          i++;
          stack3Hor.addSpacer(6);
          let text = bar.addText("" + times_hours[i]);
          text.font = Font.boldSystemFont(13);
          text.textColor = new Color(theme_list[1]);
          i++;
        }
      }
      if (boolean) {
        boolean = true;
        stack3Hor.addSpacer(12);
      }
      
    }
    
  }
  if (i >= 22 + actual_index - 2) {
    break;
  }
}
stack3Hor.bottomAlignContent();


// Present the widget
if (config.runsInWidget) {
  // If script is running in a widget, display the widget
	Script.setWidget(widget);
} else {
  // If running in the app, preview the widget
	widget.presentMedium();
}

// End of script
Script.complete();
