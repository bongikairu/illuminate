const {useState, useEffect, useCallback, Fragment} = React;

// https://github.com/kronusme/dota2-api/blob/master/data/heroes.json
// const compacted_hero_list = heroes.heroes.map(h => `${h.id}:${h.name}`).join("|");

const compacted_hero_list = "1:antimage|2:axe|3:bane|4:bloodseeker|5:crystal_maiden|6:drow_ranger|7:earthshaker|8:juggernaut|9:mirana|11:nevermore|10:morphling|12:phantom_lancer|13:puck|14:pudge|15:razor|16:sand_king|17:storm_spirit|18:sven|19:tiny|20:vengefulspirit|21:windrunner|22:zuus|23:kunkka|25:lina|31:lich|26:lion|27:shadow_shaman|28:slardar|29:tidehunter|30:witch_doctor|32:riki|33:enigma|34:tinker|35:sniper|36:necrolyte|37:warlock|38:beastmaster|39:queenofpain|40:venomancer|41:faceless_void|42:skeleton_king|43:death_prophet|44:phantom_assassin|45:pugna|46:templar_assassin|47:viper|48:luna|49:dragon_knight|50:dazzle|51:rattletrap|52:leshrac|53:furion|54:life_stealer|55:dark_seer|56:clinkz|57:omniknight|58:enchantress|59:huskar|60:night_stalker|61:broodmother|62:bounty_hunter|63:weaver|64:jakiro|65:batrider|66:chen|67:spectre|69:doom_bringer|68:ancient_apparition|70:ursa|71:spirit_breaker|72:gyrocopter|73:alchemist|74:invoker|75:silencer|76:obsidian_destroyer|77:lycan|78:brewmaster|79:shadow_demon|80:lone_druid|81:chaos_knight|82:meepo|83:treant|84:ogre_magi|85:undying|86:rubick|87:disruptor|88:nyx_assassin|89:naga_siren|90:keeper_of_the_light|91:wisp|92:visage|93:slark|94:medusa|95:troll_warlord|96:centaur|97:magnataur|98:shredder|99:bristleback|100:tusk|101:skywrath_mage|102:abaddon|103:elder_titan|104:legion_commander|106:ember_spirit|107:earth_spirit|108:abyssal_underlord|109:terrorblade|110:phoenix|105:techies|111:oracle|112:winter_wyvern|113:arc_warden|114:monkey_king|119:dark_willow|120:pangolier|121:grimstroke|129:mars|xxx1:void_spirit|xxx2:snapfire";
const full_hero_list = compacted_hero_list.split("|").map(r => r.split(":")).map(r => ({id: r[0], name: r[1]}));
const heroes = {
    heroes: full_hero_list,
};
const heroes_map = heroes.heroes.reduce((prev, cur) => Object.assign({}, prev, {[cur.id]: cur}), {});

const formatGameMode = (lobby, mode) => {
    const lobby_list = {
        0: "Normal",
        1: "Practice",
        2: "Tournament",
        3: "Tutorial",
        4: "Co-op with bots",
        5: "Team match",
        6: "Solo Queue",
        7: "Ranked",
        8: "Solo Mid 1vs1",
    };
    const mode_list = {
        23: "Turbo",
        24: "Mutation",
    };
    return (lobby_list[lobby] || "Unknown") + " " + (mode_list[mode] || "");
};

const formatDuration = (seconds) => {
    let leftover = seconds;
    let output = "";
    if (leftover > 3600) {
        output += Math.floor(leftover / 3600) + ":";
        leftover = leftover % 3600;
    }
    let minute = Math.floor(leftover / 60);
    let second = leftover % 60;
    if (minute < 10) minute = `0${minute}`;
    if (second < 10) second = `0${second}`;
    output += `${minute}:${second}`;
    return output;
};

const fetchOpenAPI = (match_id) => {
    return fetch(`https://api.opendota.com/api/matches/${match_id}`).then(r => r.json());
};

const work_queue = [];

const worker_process = () => {
    // console.log("Worker ", work_queue);
    if (work_queue.length === 0) {
        setTimeout(worker_process, 100);
    } else {
        const work = work_queue[0];
        work_queue.shift();

        const cache = localStorage.getItem(`fullmatchdata-${work.match_id}`);
        if (cache) {
            const data = JSON.parse(LZString.decompress(cache));
            work.resolve(data);
            setTimeout(worker_process, 100);
            return;
        }
        fetchOpenAPI(work.match_id)
            .then((data) => {
                if (!data.error) {
                    try {
                        localStorage.setItem(`fullmatchdata-${work.match_id}`, LZString.compress(JSON.stringify(data)));
                    } catch (e) {
                        console.log(`Can't save data for match ${work.match_id}`, e)
                        // quota exceed
                    }
                }
                work.resolve(data)
            })
            .catch((e) => {
                console.log(e);
                work.reject(null);
            })
            .finally(() => {
                setTimeout(worker_process, 1000);
            })

    }
};

worker_process();

const getGameData = (match_id) => {
    return new Promise((resolve, reject) => {
        work_queue.push({
            match_id,
            resolve,
            reject,
        })
    })
};

// for sometime, rank role added for bp/dota+
// then
// battlepass 2019 added avoid player
const dateThreshold1 = moment("2019-05-07T00:00:00Z");
// rank role out for all player
const dateThreshold2 = moment("2019-08-06T00:00:00Z");

const ReportRow = ({gamemode, timestamp, record}) => {
    const {
        report_comm,
        report_abi,
        report_feed,
        report_wrong_role_postgame,
        report_wrong_role,
        report_avoid_player,
        report_abusive_coach,
        commend_teach,
        commend_lead,
        commend_friend,
        commend_forgive,
    } = record;

    if (commend_forgive || commend_friend || commend_teach || commend_lead) {
        return (
            <span className="commend"><i className="far fa-thumbs-up"></i> Commended</span>
        );
    }

    // Row with 0 yes, it's time to guess
    if (!report_comm && !report_abi && !report_feed && !report_wrong_role_postgame && !report_wrong_role && !report_avoid_player && !report_abusive_coach) {
        let guessedType = "wrong_role";
        if (!timestamp || timestamp === "-") {
            // no timestamp yet, assume wrong rank
            guessedType = "wrong_role";
        } else {
            const m = moment(timestamp);
            if (m.isBefore(dateThreshold1)) {
                guessedType = "wrong_role"
            } else if (m.isBefore(dateThreshold2)) {
                guessedType = "blocked"
            }
        }
        if (guessedType === "wrong_role") {
            return (
                <span className="report"><i className="far fa-user-tag"></i> Reported: Did Not Play Selected Role (Unsure)</span>
            );
        }
        if (guessedType === "blocked") {
            return (
                <span className="report"><i className="far fa-thumbs-down"></i> Blocked By Another Player (Unsure)</span>
            );
        }
        return (
            <span className="report"><i className="far fa-id-badge"></i> Reported: Unspecified (Unsure)</span>
        );
    }

    return (
        <Fragment>
            {report_comm ? (
                <span className="report"><i className="far fa-headphones"></i> Reported: Comm Abuse</span>
            ) : null}
            {report_abi ? (
                <span className="report"><i className="far fa-magic"></i> Reported: Ability Abuse</span>
            ) : null}
            {report_feed ? (
                <span className="report"><i className="far fa-utensils"></i> Reported: Intentional Feeding</span>
            ) : null}
            {report_wrong_role_postgame ? (
                <span className="report"><i className="far fa-user-tag"></i> Reported: Did Not Play Selected Role (Post Game)</span>
            ) : null}
            {report_wrong_role ? (
                <span className="report"><i className="far fa-user-tag"></i> Reported: Did Not Play Selected Role</span>
            ) : null}
            {report_avoid_player ? (
                <span className="report"><i className="far fa-thumbs-down"></i> Blocked By Another Player</span>
            ) : null}
            {report_abusive_coach ? (
                <span className="report"><i className="far fa-bell-school-slash"></i> Reported: Abusive Coach</span>
            ) : null}
        </Fragment>
    );
};

const getHeroImageUrl = (hero_id) => {
    const hero = heroes_map[hero_id];
    let hero_img = "";
    if (!hero) {
        hero_img = "images/match_status/hero_status_unknown_hero.png";
    } else {
        const hero_name = hero.name;
        hero_img = `images/heroes/${hero_name}.png`;
    }
    return hero_img;
};

const MatchCard = ({match, nameList, addName, filterOutcome, filterCommend, filterReport}) => {
    const {match_id, records, hasCommend, hasReport} = match;

    const [apiData, setApiData] = useState(false);

    useEffect(() => {
        getGameData(match_id).then((response) => {
            setApiData(response);
        }).catch((e) => {
            console.log(e);
            setApiData(null);
        })
    }, [match_id]);

    const [gameData, setGameData] = useState({
        outcome: "",
        gamemode: "",
        duration: "",
        date_string: "Loading...",
        date: null,
        hero_img: "images/match_status/hero_status_loading.png",
        score_k: "-",
        score_d: "-",
        score_a: "-",
        player: null,
        data: null,
    });

    useEffect(() => {
        const response = apiData;
        let derived_data = {
            date_string: "Error: OpenDota not responding",
            date: null,
            outcome: "",
            gamemode: "",
            duration: "",
            score_k: "-",
            score_d: "-",
            score_a: "-",
            hero_img: "images/match_status/hero_status_error.png",
            player: null,
            data: null,
        };
        if (response) {
            if (!response.error) {
                const timestamp = response.start_time;
                const date_obj = new Date(timestamp * 1000);
                const date_string = date_obj.toLocaleString();

                const gamemode = formatGameMode(response.lobby_type, response.game_mode);
                const duration = formatDuration(response.duration);

                derived_data["date"] = date_obj;
                derived_data["date_string"] = date_string;
                derived_data["gamemode"] = gamemode;
                derived_data["duration"] = duration;
                derived_data["data"] = apiData;

                // finding who you are int his match
                let player = null;
                // match account id
                if (!player) {
                    let filtered_players = response.players.filter((p) => nameList.indexOf(`account:${p.account_id}`) >= 0);
                    if (filtered_players.length === 1) player = filtered_players[0];
                }
                // match name
                if (!player) {
                    let filtered_players = response.players.filter((p) => nameList.indexOf(`${p.personaname}`) >= 0);
                    if (filtered_players.length === 1) player = filtered_players[0];
                    if (player) {
                        if (nameList.filter(n => n.startsWith("account:")).length === 0) {
                            addName([`account:${player.account_id}`]);
                        }
                    }
                }
                // match specific slot
                if (!player) {
                    let filtered_players = response.players.filter((p) => nameList.indexOf(`match:${p.match_id}:${p.player_slot}`) >= 0);
                    if (filtered_players.length === 1) player = filtered_players[0];
                }

                if (player) {
                    const hero_id = player.hero_id;
                    derived_data["hero_img"] = getHeroImageUrl(hero_id);
                    derived_data["score_k"] = player.kills;
                    derived_data["score_d"] = player.deaths;
                    derived_data["score_a"] = player.assists;
                    derived_data["outcome"] = player.win;
                    derived_data["player"] = player;
                } else {
                    derived_data["hero_img"] = "images/match_status/hero_status_unknown.png";
                }
            } else {
                derived_data["date_string"] = "Error: OpenDota match not found";
                derived_data["hero_img"] = "images/match_status/hero_status_404.png";
            }
        } else if (response === false) {
            derived_data["date_string"] = "Loading...";
            derived_data["hero_img"] = "images/match_status/hero_status_loading.png";
        } else {
            derived_data["date_string"] = "Error: OpenDota not responding";
            derived_data["hero_img"] = "images/match_status/hero_status_error.png";
        }
        setGameData(derived_data);
    }, [apiData, nameList]);

    const {
        outcome,
        gamemode,
        duration,
        date,
        date_string,
        hero_img,
        score_k,
        score_d,
        score_a,
        player,
        data,
    } = gameData;

    let is_hidden = false;

    if (filterOutcome === "win") {
        if (outcome === "" || !outcome) is_hidden = true
    } else if (filterOutcome === "lose") {
        if (outcome === "" || !!outcome) is_hidden = true
    }

    if (filterCommend && !hasCommend) {
        is_hidden = true;
    }

    if (filterReport && !hasReport) {
        is_hidden = true;
    }

    return (
        <tr className={"match_row " + (is_hidden ? "hidden" : "")}>
            <td className="match text-right">
                <a href={`https://www.opendota.com/matches/${match_id}`} target="_blank">{match_id}</a>
                {" "}
                {outcome !== "" && !!outcome ? (
                    <span className="win ml-1 font-weight-bold">WIN</span>
                ) : null}
                {outcome !== "" && !outcome ? (
                    <span className="lose ml-1 font-weight-bold">LOSE</span>
                ) : null}
                <br/>
                <span className="gamemode mr-1">{gamemode}</span>
                <span className="duration mr-1">{duration}</span>
                <a className="opendota" href={`https://www.opendota.com/matches/${match_id}`} target="_blank">&lt;/&gt;</a>
                {" "}
                <a className="dotabuff" href={`https://www.dotabuff.com/matches/${match_id}`} target="_blank">D</a>
                {" "}
                <a className="stratz" href={`https://stratz.com/en-us/match/${match_id}`} target="_blank">⇑</a>
                <br/>
                {date_string}
            </td>
            <td className="icon pb-1 text-center">
                <img className="mb-1 mt-1" src={hero_img} height="34"/>
                <br/>
                <span className="score_k">{score_k}</span>
                <span className="kda_spacer">/</span>
                <span className="score_d">{score_d}</span>
                <span className="kda_spacer">/</span>
                <span className="score_a">{score_a}</span>
            </td>
            <td className="summary">
                {records.map((record, i) => (
                    <Fragment key={i}>
                        {i !== 0 ? (<hr/>) : null}
                        <ReportRow mode={gamemode} timestamp={date} record={record}/>
                    </Fragment>
                ))}
                {(!!data && !player) ? (
                    <Fragment>
                        <hr/>
                        <span className="untagged_title">We're not sure who you are in this match:</span>
                        <ul>
                            {data.players.map((p) => {
                                const hero_img = getHeroImageUrl(p.hero_id);
                                return (
                                    <li>
                                        <a href={"#"} onClick={(e) => {
                                            e.preventDefault();
                                            let nameToAdd = [
                                                `match:${p.match_id}:${p.player_slot}`
                                            ];
                                            if (p.personaname) {
                                                nameToAdd.push(p.personaname);
                                            }
                                            if (p.account_id) {
                                                nameToAdd.push(`account:${p.account_id}`);
                                            }
                                            addName(nameToAdd);
                                        }}>
                                            <img className="mr-1 mb-1" src={hero_img} height="15"/>
                                            {p.personaname || "Unidentified"}
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                        <span className="untagged_description">Please click on your name to view the match info. If your name is not displayed, you may need to <a href="https://purgegamers.true.io/art/how-to-load-all-match-data-in-dotabuff/">enable the Expose Public Match Data setting</a>.</span>
                    </Fragment>
                ) : null}
            </td>
        </tr>
    );
};

const OutputCard = () => {
    const [showCommendOnly, setShowCommendOnly] = useState(false);
    const [showReportOnly, setShowReportOnly] = useState(false);
    const [showOutcomeType, setShowOutcomeType] = useState("all");

    const raw_data = location.hash.substring(1);
    const data = raw_data.split(",");
    const name = decodeURIComponent(data[0]);

    const [nameList, setNameList] = useState([name]);

    const addName = useCallback((appendList) => {
        setNameList([...nameList, ...appendList]);
    }, [nameList]);

    const records = data.slice(1).map(row => {
        if (!row) return null;
        const splitted_row = row.split("-");

        const match_id = splitted_row[0];
        if (isNaN(parseInt(match_id))) return null;

        const timestamp = splitted_row[1];

        const parsed_row = splitted_row[2].split("");

        const report_comm = parsed_row[0] === "1";
        const report_abi = parsed_row[1] === "1";
        const report_feed = parsed_row[2] === "1";
        const report_wrong_role_postgame = parsed_row[3] === "1";
        const report_wrong_role = parsed_row[4] === "1";
        const report_avoid_player = parsed_row[5] === "1";
        const report_abusive_coach = parsed_row[6] === "1";
        const commend_lead = parsed_row[7] === "1";
        const commend_teach = parsed_row[8] === "1";
        const commend_friend = parsed_row[9] === "1";
        const commend_forgive = parsed_row[10] === "1";

        return {
            match_id,
            timestamp,
            report_comm,
            report_abi,
            report_feed,
            report_wrong_role_postgame,
            report_wrong_role,
            report_avoid_player,
            report_abusive_coach,
            commend_lead,
            commend_teach,
            commend_friend,
            commend_forgive,
        }
    });

    let matches = [];
    records.filter(row => !!row).forEach(row => {
        if (matches.length > 0) {
            if (matches[matches.length - 1].match_id === row.match_id) {
                matches[matches.length - 1].records.push(row);
                return;
            }
        }
        matches.push({
            match_id: row.match_id,
            records: [
                row,
            ],
        });
    });
    matches = matches.map((match) => {
        let hasCommend = false;
        let hasReport = false;
        match.records.forEach((record) => {
            const {
                commend_teach,
                commend_lead,
                commend_friend,
                commend_forgive,
            } = record;
            if (commend_forgive || commend_friend || commend_teach || commend_lead) {
                hasCommend = true;
                return;
            }
            // if not commend, it's reported of some kind
            hasReport = true;
        });
        return {
            ...match,
            hasCommend,
            hasReport,
        }
    });

    return (
        <div id="output" className="mt-3">
            <div className="card">
                <div className="card-body">
                    <div className="card-title float-left" id="output_title">
                        <h2>{name}'s Commend/Report Data</h2>
                    </div>
                    <div className="float-right">
                        <div className="btn-group btn-group-toggle" data-toggle="buttons">
                            <label className={"btn btn-secondary " + (showCommendOnly ? "active" : "")}>
                                <input type="checkbox" autoComplete="off" id="filter_commend" onClick={() => setShowCommendOnly(!showCommendOnly)}/>
                                Commended
                            </label>
                            <label className={"btn btn-secondary " + (showReportOnly ? "active" : "")}>
                                <input type="checkbox" autoComplete="off" id="filter_report" onClick={() => setShowReportOnly(!showReportOnly)}/>
                                Reported
                            </label>
                        </div>
                    </div>
                    <div className="float-right mr-3">
                        <div className="btn-group btn-group-toggle" data-toggle="buttons">
                            <label className={"btn btn-secondary " + (showOutcomeType === "all" ? "active" : "")}>
                                <input type="radio" name="filter_outcome" autoComplete="off" id="filter_outcome_all" onClick={() => setShowOutcomeType("all")}/>
                                All
                            </label>
                            <label className={"btn btn-secondary " + (showOutcomeType === "win" ? "active" : "")}>
                                <input type="radio" name="filter_outcome" autoComplete="off" id="filter_outcome_win" onClick={() => setShowOutcomeType("win")}/>
                                Win
                            </label>
                            <label className={"btn btn-secondary " + (showOutcomeType === "lose" ? "active" : "")}>
                                <input type="radio" name="filter_outcome" autoComplete="off" id="filter_outcome_lose" onClick={() => setShowOutcomeType("lose")}/>
                                Lose
                            </label>
                        </div>
                    </div>
                    <h5 id="filter_title" className="card-title float-right mr-3">Filter: </h5>
                    <p className="card-text" id="output_data">
                        <table className="table table-striped table-sm">
                            <tbody>
                            {matches.map((match) => (
                                <MatchCard
                                    key={match.match_id}
                                    match={match}
                                    nameList={nameList}
                                    addName={addName}
                                    filterCommend={showCommendOnly}
                                    filterReport={showReportOnly}
                                    filterOutcome={showOutcomeType}
                                />
                            ))}
                            </tbody>
                        </table>
                    </p>
                </div>
            </div>
        </div>
    )
};

const App = () => {

    let isOutputMode = false;

    if (location.hash && location.hash !== "#") {
        isOutputMode = true;
    }

    let [showManualInstruction, setShowManualInstruction] = useState(false);

    return (
        <Fragment>
            <img id="logo" src="images/illuminate_logo.png" alt="Illuminate Logo"/>
            <div>
                <h1>Illuminate</h1>
                <h2>See what Dota 2 matches you get commended and reported in</h2>
            </div>

            <hr/>

            {isOutputMode ? (
                <OutputCard/>
            ) : null}

            {!isOutputMode ? (
                <div id="whatis">
                    <h3>What is Illuminate?</h3>
                    <div>Illuminate is a tool that parses the Dota 2 GDPR data and displays what matches you get 
                    commended or reported in, along with stats for the relevant matches.</div>
                    <h3>Is my commend/report history sent to a server?</h3>
                    <div>No. All GDPR data is stored and processed on your browser, and is never sent to any
                    remote server.</div>
                    <h3>Where do you get the public match data from?</h3>
                    <div>All match data is sourced from <a href="https://www.opendota.com/">OpenDota</a>; if it 
                    doesn't appear, please check that your matches are displayed there!</div>
                </div>
            ) : null}

            {!isOutputMode ? (
                <div id="instruction" className="mt-3">
                    <div className="card">
                        <div className="card-body">
                            <h3><i className="far fa-clipboard-list"></i> How to use</h3>

                            <ol className="how_to_use">
                                <li>
                                    Install our extension:
                                    <br/>
                                    <div className="m-3">
                                        {"Available for "}
                                        <a href={"https://chrome.google.com/webstore/detail/chakra-magic/ldamnagiplkkoeolomjiigkfaobbecbo"} target="_blank">
                                            <img className="browser_icon" alt={"Google Chrome Icon"} src={"images/chrome_icon.png"}/> Google Chrome
                                        </a>
                                        {" and "}
                                        <a href={"https://addons.mozilla.org/en-US/firefox/addon/chakra-magic/"} target="_blank">
                                            <img className="browser_icon" alt={"Mozilla Firefox Icon"} src={"images/firefox_icon.png"}/> Mozilla Firefox
                                        </a>
                                    </div>
                                </li>
                                <li>
                                    Click on the <i>Chakra Magic</i> icon:
                                    <br/>
                                    <img className="sample_image" alt={"Example image of extension icon location"} src={"images/extension_icon_example.png"}/>
                                    <br/>
                                    <span className="text-warning">If you have many extensions, it may be hidden: in that case, click on the rightmost button to see all installed extensions.</span>
                                </li>
                                <li>
                                    Click on the <i>Illuminate</i> icon:
                                    <br/>
                                    <img className="sample_image" alt={"Example image of in-page icon location"} src={"images/inpage_icon_example.png"}/>
                                </li>
                                <li>
                                    Wait until the data finishes loading <i className="far fa-laugh-wink"></i>
                                    <br/>
                                    <img className="sample_image" alt={"Example image of in-page icon location"} src={"images/inpage_loading_example.png"}/>
                                </li>
                            </ol>

                            <div className="mb-3">
                                If you don't want to use the extension, or you are using an unsupported browser, you can&nbsp;
                                <a href={"#"} onClick={(e) => {
                                    e.preventDefault();
                                    setShowManualInstruction(true);
                                }}>
                                    {"run the fetch script manually"}
                                </a>.
                            </div>

                            {showManualInstruction ? (
                                <Fragment>
                                    <h3>Manually fetching the data</h3>
                                    <ol className="how_to_use">
                                        <li>
                                            Open <a
                                            href="https://steamcommunity.com/my/gcpd/570/?category=Account&tab=MatchPlayerReportIncoming"
                                            target="_blank">this page</a>.
                                        </li>
                                        <li>
                                            Press <code>Ctrl+Shift+K</code> to open the Developer Console.
                                        </li>
                                        <li>
                                            <div>
                                                Copy the following code, then paste it in the developer console and press Enter.
                                            </div>
                                            <textarea
                                                id="script_box"
                                                className="form-control"
                                                readOnly
                                                style={{color: "white", wordBreak: "break-all"}}
                                                rows="11"
                                                value={'(()=>{const a=()=>{const a=document.getElementsByClassName("profile_small_header_name")[0].children[0].textContent,b=document.getElementById("personaldata_elements_container").querySelectorAll("tr"),c=["Yes","\\u0414\\u0430","Ano","Ja","Kyll\\xE4","Oui","\\u039D\\u03B1\\u03B9","Igen","S\\xEC","\\u306F\\u3044","\\uC608","Tak","Sim","Da","\\u662F","S\\xED","\\u0E43\\u0E0A\\u0E48","Evet","\\u0422\\u0430\\u043A"];let d=encodeURIComponent(a)+",";for(let a=1;a<b.length;a++){const e=b[a].querySelectorAll("td");if(0===e.length)continue;let f="";f+=e[0].textContent+"-"+e[1].textContent+"-";for(let a=2;a<e.length;a++)f+=-1===c.indexOf(e[a].textContent)?"0":"1";d+=f+","}window.location="https://illuminate.dotasphere.com/#"+d};(()=>{const b=document.getElementById("load_more_button"),c=document.getElementById("inventory_history_loading"),d=()=>b&&"none"!==b.style.display||c&&"none"!==c.style.display,e=()=>b&&"none"!==b.style.display,f=()=>b.click(),g=document.getElementById("personaldata_elements_container");if(!g)return alert("Data table not found, make sure you are on steam GDPR page");const h=document.createElement("h1"),i=document.createTextNode("Loading more data "),j=document.createElement("img");j.src="https://steamcommunity-a.akamaihd.net/public/images/login/throbber.gif",h.appendChild(i),h.appendChild(j),g.insertBefore(h,g.childNodes[0]),(()=>{const b=setInterval(()=>{e()?f():!d()&&(clearInterval(b),console.log("done"),a())},100)})()})()})();'}
                                            />
                                            <div>If you don't want to use a minified script, you can use <a
                                                href="https://github.com/bongikairu/illuminate/blob/master/console_script.js">the full version available on GitHub</a>.
                                            </div>
                                        </li>
                                        <li>
                                            Wait until the data finishes loading <i className="far fa-laugh-wink"></i>
                                        </li>
                                    </ol>
                                </Fragment>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="mt-3">
                <h3>Privacy Policy</h3>
                <div>
                    Illuminate does everything client-side: it passes commend/report data through the URL anchor, and fetches match data locally through the OpenDota API.<br></br>
                    However, Google Analytics is present on the page, and it will send some anonymous data to Google to help us improve the website.
                </div>
                <div>
                    <a href={"pp.html"}>Read our Privacy Policy</a>
                </div>
            </div>

            <div className="mt-3">
                <h3>Development</h3>
                <div>
                    If you have found a bug, or want to help improve this project, please visit&nbsp;
                    <a href="https://github.com/bongikairu/illuminate" className="ml-1"><i className="fab fa-github"></i>&nbsp;the GitHub project page</a>&nbsp;
                    or join <a href="https://discord.gg/x5QHsVV"><i className="fab fa-discord"></i>&nbsp;our Discord server</a>.
                </div>
            </div>

            <hr/>

            <div className="mt-3 text-center text-muted">
                <div>Illuminate v2.3.0</div>
                <div>A Dota 2 Match Report Data Linker</div>
                <div>Created by <a href="https://github.com/bongikairu">bongikairu</a></div>
                <div>Powered by the <a href="https://docs.opendota.com/">OpenDota API</a></div>
                <div>Illuminate is a community tool and is not affiliated with Dota 2 or Valve.</div>
                <div id="rip">RIP yearbeast and d2armory</div>
            </div>
        </Fragment>
    )
};

// Init script

for (let key in localStorage) {
    if (key.startsWith("match-") || key.startsWith("matchdata-")) localStorage.removeItem(key);
}

ReactDOM.render(
    (
        <App/>
    ),
    document.getElementById('root')
);