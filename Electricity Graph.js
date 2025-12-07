// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-gray; icon-glyph: magic;
// You can use widget Parameters (long press on the widget on homescreen) to change theme, country, tax and either price by hour or byevery 15 minutes (otherwise it will use default settings)
// A few examples:
// "🇪🇪, 24, hours, dark-yellow"
// "🇱🇻, 21, minutes, light"
// "🇫🇮, 25, light" (if any setting is missing, it will return to default setting - hours view in this case)

// Programmeeritud Eestis 🇪🇪 - Rikolan




// Change this field where necessary
var tax = 24 // value in %
var country = "EE" // Country codes (EE, LT, LV, FI)
var hours_view = true // choose to display graph in every 15 min or by every hour
var theme = "light"; // light, dark, dark-yellow, yellow, green, blue, yellow (Theme switcher) - light color theme is a fallback theme

const cent = " s";
const norm_line = 10; // In cents, shown as white dots
const bars = 25; // Amount of bars (24 is optimal)
const aesthetic_scale = true; // If true, will use "max_price_display" value to scale the graph
const max_price_display = 5; // The maximum value set for the graph, if the prices are lower than the set value (default = 5)




if (config.runsInApp) {
    let alert = new Alert();
    alert.title = "Use 'Widget Parameters' to customise this widget\n";
    alert.message = "Long press the Scriptable Widget on the Home-Screen to edit the theme, country, tax or time-view, by adding text to the 'Parameters' field.\n\nSome examples:\n\n🇪🇪, 24, hours, dark\n\n🇱🇻, 21, minutes, light\n\n🇫🇮, 25, hours, dark-yellow";
    alert.addAction("Got it!");
    await alert.present();
}




//Check if user has specified custom parameters
const user_params = args.widgetParameter

//Layout - "🇪🇪, 24, hours, dark-yellow"
if (user_params != undefined || user_params != null) {
    
    //Theme
	if (user_params.includes("dark-yellow")) {
        theme = "dark-yellow";
    } else if (user_params.includes("yellow")) {
        theme = "yellow";
    } else if (user_params.includes("blue")) {
        theme = "blue";
    } else if (user_params.includes("green")) {
        theme = "green";
    } else if (user_params.includes("dark")) {
        theme = "dark";
    } else if (user_params.includes("light")) {
        theme = "light";
    }
    
    //Country
	if (user_params.includes("🇪🇪")) {
        country = "EE";
    } else if (user_params.includes("🇱🇻")) {
        country = "LV";
    } else if (user_params.includes("🇱🇹")) {
        country = "LT";
    } else if (user_params.includes("🇫🇮")) {
        country = "FI"
    }
    
    //Hour view
	if (user_params.includes("hours")) {
        hours_view = true;
    } else if (user_params.includes("minutes")) {
        hours_view = false;
    }
    
    //Tax
	const match = user_params.match(/\d+/);
	if (match) tax = parseFloat(match);
    
}




// Light and dark theme toggle
// [high contrast, middle contrast, low contrast, background]
function theme_switch() {
    let listing = []
    if (theme == "dark-yellow") {
        listing = ["#fcba03", "#966f03", "#3c2c01", "#1C1C1E"]
    } else if (theme == "yellow") {
        listing = ["#1C1C1E", "#3c2c01", "#966f03", "#fcba03"]
    } else if (theme == "dark") {
        listing = ["#ffffff", "#adadad", "#4a4a4a", "#1e1e1e"]
    } else if (theme == "blue") {
        listing = ["#E6EFFE", "#8DB7FB", "#3480F9", "075CE4"]
    } else if (theme == "green") {
        listing = ["#EBFAEB", "#C7F0C7", "#7FDC7F", "#2DA42D"]
    } else {
        listing = ["#000000", "#adadad", "#cccccc", "#ffffff"]
    }
    return listing;
}




// Convert UNIX time to normal time, formatted as [year, month, day, hour, minute, second]
function unix_to_normal(unix_time) {
    const date = new Date(unix_time * 1000);

    // Gets the propers times separately
    var year = date.getFullYear();
    var month = ("0" + (date.getMonth() + 1)).substr(-2);
    var day = ("0" + date.getDate()).substr(-2);
    var hour = ("0" + date.getHours()).substr(-2);
    var minute = ("0" + date.getMinutes()).substr(-2);
    var second = ("0" + date.getSeconds()).substr(-2);

    // Converts the whole ordeal into a proper date
    var normal_time = [year, month, day, hour, minute, second];
    return normal_time;
}




// Get the latest elering data (time in UNIX and price)
async function elering_latest() {
    let req = new Request("https://dashboard.elering.ee/api/nps/price/" + country + "/latest");
    let html = await req.loadString();
    let json = JSON.parse(html);
    let latest = json.data[0].timestamp;
    return latest;
}




// Check for internet connection
async function hasInternet() {
    try {
        let isConnected = await elering_latest();
        return true;
    } catch (error) {
        return false;
    }
}




// Gets two days worth of data and translate it to be readable for the graph widget
async function two_days_of_data() {
    let latest_unix = await elering_latest();
    let two_days_ago_unix = latest_unix - 172800; //subtract two days from the latest time

    let normal_latest_array = unix_to_normal(latest_unix);
    let normal_two_days_ago_array = unix_to_normal(two_days_ago_unix);

    //Convert times to elering link friendly format
    function time_to_link(time) {
        return time[0] + "-" + time[1] + "-" + time[2] + "T" + time[3] + "%3A" + time[4] + "%3A" + time[5];
    }

    let normal_latest = time_to_link(normal_latest_array);
    let normal_two_days_ago = time_to_link(normal_two_days_ago_array);
    let req = new Request("https://dashboard.elering.ee/api/nps/price?start=" + normal_two_days_ago + "Z&end=" + normal_latest + "Z");
    let html = await req.loadString();
    let json = JSON.parse(html);
    let data_two_days = "";

    if (country === "EE") {
        data_two_days = json.data.ee;
    } else if (country === "LV") {
        data_two_days = json.data.lv;
    } else if (country === "LT") {
        data_two_days = json.data.lt;
    } else {
        data_two_days = json.data.fi;
    }
	
    //returns raw data in json format (timestamp, price)
	//console.log(data_two_days);
	return data_two_days;
}




//Save the json data to local cache
const cacheKey = "tpCacheKey";
const cachePath = FileManager.local().joinPath(FileManager.local().cacheDirectory(), cacheKey);

async function save_json_locally() {
    // store the data into a cache
	let eg_json = await two_days_of_data();
    
  	//let tp_json = JSON.stringify(graph);
  	FileManager.local().writeString(cachePath, JSON.stringify(eg_json));
    
    return eg_json;
}




// Get json data from the web or locally (if no connection is present)
async function get_json() {
    isConnected = await hasInternet();
	let eg_json;

    if (isConnected) {
        // Gets new data and saves it locally
        console.log("Connection is present - Getting new data");
        eg_json = await save_json_locally();

    } else {
		// Gets the cached data
        console.log("No connection - resorting to local data");
        eg_json = JSON.parse(FileManager.local().readString(cachePath));
    }
    
    return eg_json;
}




//Convert eg_json to a proper array "graph"
async function get_graph() {
    let eg_json = await get_json();
	let graph = [];
    let start_index = 0;
    
    //Get the start index with full hour (eg: 12:00)
    for (let i = 0; i < eg_json.length; i++) {
        let minutes = unix_to_normal(eg_json[i].timestamp)[4];
        
        if (minutes == "00") {
            start_index = i;
            break;
        }
    }
    
    for (let i = start_index; i < eg_json.length; i++) {
        let time = eg_json[i].timestamp;
        let price = eg_json[i].price;
        let time_chart = unix_to_normal(time);
        
        var price_rounded = 0;
        
        if (hours_view) {
            for (let x = i; x < eg_json.length && x < i + 4; x++) {
                price_rounded += eg_json[x].price;
            }
            
            price_rounded = Math.round(((price_rounded / 4) * (100 + tax) / 1000) * 100) / 100;
            graph.push([time, price_rounded, time_chart[3], "00"]);
            i += 3;
        } else {
            price_rounded = Math.round((price * (100 + tax) / 1000) * 100) / 100;
            graph.push([time, price_rounded, time_chart[3], time_chart[4]]);
        }
        
    }
    
    return graph;
}




//Gets the index from graph, using current time
function current_index_from_graph(graph, unix) {
    let index = 0;
    for (let i = 0; i < graph.length; i++) {
        if(graph[i][0] > unix) {
            index = i - 1;
            break;
        }
    }
    return index;
}


// Get the highest price out of 24 hours
function get_highest_price(graph, current_index) {
    let highest = 0;

    for (let i = current_index - 1; i < graph.length; i++) {
        // Checks that it doesn't go over the bars amount (hours)
        if ((i - current_index) <= (bars - 1)) {
            if (graph[i][1] > highest) {
                highest = graph[i][1];
            }
        } else {
            break;
        }
    }

    if ((highest < max_price_display) && (aesthetic_scale)) {
        highest = max_price_display;
    }

    return highest;
}




// Clean data
let graph = await get_graph();
let current_unix = Date.now() / 1000; //Get current time in UNIX
let current_index = current_index_from_graph(graph, current_unix); //Get the current relevant index from the graph

let current_data = graph[current_index];
let highest_price = get_highest_price(graph, current_index);

let hour_inc = ["00", "06", "12", "18"];
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
stack1.size = new Size(250,40);

let leftText = leftBox.addStack();
let rightText = rightBox.addStack();
leftText.layoutVertically();
rightText.layoutVertically();




// Add current price in big text
let priceItem = leftText.addText(graph[current_index][1].toString());
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

	//Only calculate the 24 bar window
  for (let i = current_index - 1; i < graph.length; i++) {
    let scaled = Math.round((70 / highest_price) * (graph[i][1]));
    if (scaled < 6) {
      scaled = 6;
    }
    
    prices_scaled[i] = scaled;
	
    //Break, if 24 bars have been exceeded
    if (i - current_index - 1 >= 24) {
        break;
    }
    
  } 
  return prices_scaled;
}




// Create a bar charts with prices
let prices_scaled = scale_prices();

for (let i = current_index - 1; i < bars + current_index - 1; i++) {
    // Creates a standard bar with a standard size
    let bar_main = stack2Hor.addStack();
    bar_main.size = new Size(6, 70);
    //bar_main.cornerRadius = 5;
    bar_main.bottomAlignContent();
        
    // Draw the bar  
    let dc = new DrawContext();
    dc.respectScreenScale = true;
    dc.size = new Size(6, 70);
    //Background rectangle
    dc.setFillColor(new Color(theme_list[3]));
    dc.fillRect(new Rect(0, 0, 6, 70));
  
                      
 	if (i < prices_scaled.length) {
        let chosen_hour = graph[i][2];
        let chosen_minute = graph[i][3];
    
        //Add a ten cent marker line to the background
		var shift_y = 70 - ((70 / highest_price) * norm_line);
        	dc.setFillColor(new Color(theme_list[2], 0.3));
		let path = new Path();
        	path.addRoundedRect(new Rect(0, shift_y - 2, 6, 4), 2, 2);
        	dc.addPath(path)
        	dc.fillPath()
        
        if (i == current_index) {
            //Price scale rectangle
			//Shift the y axis
			shift_y = 70 - prices_scaled[i];
        
			dc.setFillColor(new Color(theme_list[0]));
        		path = new Path();
        		path.addRoundedRect(new Rect(0, shift_y, 6, prices_scaled[i]), 3, 3);
        		dc.addPath(path)
        		dc.fillPath()
            
        } else {
            
            //Price scale rectangle
			shift_y = 70 - prices_scaled[i]; //Shift the y axis
			dc.setFillColor(new Color(theme_list[2]));
        		path = new Path();
        		path.addRoundedRect(new Rect(0, shift_y, 6, prices_scaled[i]), 3, 3);
        		dc.addPath(path)
        		dc.fillPath()
        		
            //If it's one of the main hours, add a high-lighter on it
        		if ((hours_view && hour_inc.includes(chosen_hour)) || (!hours_view && chosen_minute == "00")) {
                dc.setFillColor(new Color(theme_list[0], 0.07));
                path = new Path();
                path.addRoundedRect(new Rect(0, shift_y, 6, prices_scaled[i]), 3, 3);
        			dc.addPath(path)
        			dc.fillPath()
            }
            
            if ((70 / highest_price) * norm_line < prices_scaled[i]) {
                //Add a ten cent marker line on the bar
				shift_y = 70 - ((70 / highest_price) * norm_line);
        			dc.setFillColor(new Color(theme_list[0], 0.5));
				path = new Path();
        			path.addRoundedRect(new Rect(0, shift_y - 2, 6, 4), 2, 2);
        			dc.addPath(path)
        			dc.fillPath()
            }
            
        }
    		
        
    
    } else {
        //When no data, bars are rendered as grey dots
		//Shift the y axis
		var shift_y = 70 - 6;
        
		dc.setFillColor(new Color(theme_list[2], 0.25));
        	let path = new Path();
        	path.addRoundedRect(new Rect(0, shift_y, 6, 6), 3, 3);
        	dc.addPath(path)
        	dc.fillPath()
        
        
    }		
    
    //Add the created drawings to bars
    bar_main.addImage(dc.getImage());
    
    //If there are no more bars, do not create an empty one    
    if (i < bars + current_index - 2) {
        stack2Hor.addSpacer(6);
    }
}
stack2Hor.bottomAlignContent();




// Here go the time values
for (let i = current_index - 1; i < graph.length; i++) {
  let bar = stack3Hor.addStack();
  
  // There are 24 bars, but the loop start at the current index (thus the 24)
  // If i fits in the range of 22
  if (i <= bars + current_index - 2) {
    
    // sets the first current hour indicator
  	if (i == current_index - 1) {
      bar.size = new Size(30, 15);
      i++;
      // bar.backgroundColor = new Color("#ffffff");
		stack3Hor.addSpacer(6);
      let text = bar.addText("" + graph[i][2]);
  		text.font = Font.boldSystemFont(13);
      text.textColor = new Color(theme_list[0]);
      i++;
      
    } else if ((i > current_index) && (i < bars + current_index - 2)) {
      let boolean = true;
      let chosen_hour = graph[i + 1][2];
      let chosen_minute = graph[i + 1][3];
      
      if (hours_view) {
          if (hour_inc.includes(chosen_hour)) {
            boolean = false;
            bar.size = new Size(30, 15);
            i++;
            stack3Hor.addSpacer(6);
            let text = bar.addText("" + graph[i][2]);
            text.font = Font.boldSystemFont(13);
            text.textColor = new Color(theme_list[1]);
            i++;
        }
      } else {
         if (chosen_minute == "00") {
           boolean = false;
           bar.size = new Size(30, 15);
           i++;
           stack3Hor.addSpacer(6);
           let text = bar.addText("" + graph[i][2]);
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
  if (i >= 22 + current_index - 2) {
    break;
  }
}
stack3Hor.bottomAlignContent();




// Siri response with current price and next cheapest price
if (config.runsWithSiri) {
  Speech.speak("The current price is " + graph[current_index][1] + " cents per kilowatt hour.");
}


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








