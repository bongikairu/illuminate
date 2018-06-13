(() => {
    const read_data = () => {
        const player_name = document.getElementsByClassName("profile_small_header_name")[0].children[0].textContent;
        const row_list = document.getElementById("personaldata_elements_container").querySelectorAll("tr");
        let all_output = player_name + ",";
        for (let i = 1; i < row_list.length; i++) {
            const col_list = row_list[i].querySelectorAll("td");
            let output = "";
            for (let j = 0; j < col_list.length; j++) {
                output += (j === 0) ? col_list[j].textContent + "-" : (col_list[j].textContent === "Yes" ? "1" : "0");
            }
            all_output += output + ","
        }
        window.location = "https://illuminate.dotasphere.com/#" + all_output;
    };
    const has_more = () => document.getElementById("load_more_button").style.display !== "none" || document.getElementById("inventory_history_loading").style.display !== "none";
    const has_load_more = () => document.getElementById("load_more_button").style.display !== "none";
    const load_more = () => document.getElementById("load_more_button").click();
    const watch_load_more = () => {
        const interval = setInterval(() => {
            if(has_load_more()) {
                load_more();
            } else {
                if(!has_more()) {
                    clearInterval(interval);
                    console.log(`done`);
                    read_data();
                }
            }
        }, 100);
    }
    watch_load_more();
})();
