// Will compress using https://jscompress.com/
(() => {
    const read_data = () => {
        // Get player name, use this to match it to player name from API response
        const player_name = document.getElementsByClassName("profile_small_header_name")[0].children[0].textContent;
        // Get table row
        const row_list = document.getElementById("personaldata_elements_container").querySelectorAll("tr");
        // List of word that indicate this cell means yes
        const yes_marks = [
            "Yes",
            "Да",
            "Ano",
            "Ja",
            "Kyllä",
            "Oui",
            "Ναι",
            "Igen",
            "Sì",
            "はい",
            "예",
            "Tak",
            "Sim",
            "Da",
            "是",
            "Sí",
            "ใช่",
            "Evet",
            "Так",
        ];
        // Building compacted output, first cell is player name, each cell is splitted by ,
        let all_output = encodeURIComponent(player_name) + ",";
        // Each table row
        for (let i = 1; i < row_list.length; i++) {
            const col_list = row_list[i].querySelectorAll("td");
            // td count will be 0 if this is a table header (it use th)
            if (col_list.length === 0) continue;
            // Build row output from {match id}-{indicator}-{timestamp}
            let output = "";
            output += col_list[0].textContent + "-0";   // extra 0 for backward compatibility
            for (let j = 2; j < col_list.length; j++) {
                output += yes_marks.indexOf(col_list[j].textContent) !== -1 ? "1" : "0";
            }
            output += "-" + col_list[1].textContent;    // timestamp after data for backward compatibility
            all_output += output + ","
        }
        // Redirect user to illuminate to have this output data shown in better format
        window.location = "https://illuminate.dotasphere.com/#" + all_output;
    };
    const load_all_data = () => {
        // Get Element Handle
        const b1 = document.getElementById("load_more_button");
        const b2 = document.getElementById("inventory_history_loading");
        // Checking if there is more data by inspecting button and loading text style
        const has_more = () => {
            return (b1 && b1.style.display !== "none") || (b2 && b2.style.display !== "none");
        };
        const has_load_more = () => b1 && b1.style.display !== "none";
        const load_more = () => b1.click();
        // Loop checking the page, if it is done, read_data()
        const watch_load_more = () => {
            const interval = setInterval(() => {
                if (has_load_more()) {
                    load_more();
                } else {
                    if (!has_more()) {
                        clearInterval(interval);
                        console.log("done");
                        read_data();
                    }
                }
            }, 100);
        };
        // Just visual indicator that the script is working
        const b3 = document.getElementById("personaldata_elements_container");
        if (!b3) return alert("Data table not found, make sure you are on steam GDPR page");
        const h1 = document.createElement("h1");
        const h1text = document.createTextNode("Loading more data ");
        const h1spinner = document.createElement("img");
        h1spinner.src = "https://steamcommunity-a.akamaihd.net/public/images/login/throbber.gif";
        h1.appendChild(h1text);
        h1.appendChild(h1spinner);
        b3.insertBefore(h1, b3.childNodes[0]);
        // Start checking loop
        watch_load_more();
    };
    load_all_data();
})();
