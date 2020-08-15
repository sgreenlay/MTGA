const fs = require("fs");
const path = require('path');

function getMTGAInstallPath() {
    var paths = [
        `C:\\Program Files\\Wizards of the Coast\\MTGA`,
        `C:\\Program Files\\Epic Games\\MagicTheGathering`
    ];
    for (var i = 0; i < paths.length; ++i) {
        if (fs.existsSync(paths[i]) && fs.lstatSync(paths[i]).isDirectory()) {
            return paths[i];
        }
    }
    return "";
}

const mtgaPath = getMTGAInstallPath();
const mtgaData = path.join(mtgaPath, `MTGA_Data`);

function getLatestFile(folder, filter) {
    var out = [];

    const files = fs.readdirSync(folder);
    files.forEach((fileName) => {
        if (filter != null && !filter(fileName)) {
            return;
        }
        const fullPath = path.join(folder, fileName);
        const stats = fs.statSync(fullPath);
        if (stats.isFile()) {
            out.push({
                path : fullPath,
                mtime : stats.mtime.getTime()
            });
        }
    });
    out.sort((a,b) => {
        return b.mtime - a.mtime;
    })
    return (out.length > 0) ? out[0].path : "";
}

function getCardDatabase() {
    const dataPath = path.join(mtgaData, `Downloads\\Data`);

    const cardDataPath = getLatestFile(dataPath, function(filename) {
        return filename.startsWith("data_cards_") && filename.endsWith(".mtga");
    });
    if (cardDataPath == "") {
        return "";
    }

    const locDataPath = getLatestFile(dataPath, function(filename) {
        return filename.startsWith("data_loc_") && filename.endsWith(".mtga");
    });
    if (locDataPath == "") {
        return "";
    }

    var titleIdToTitle = {};
    {
        const data = fs.readFileSync(locDataPath, 'UTF-8');
        const localizations = JSON.parse(data);

        const enUS = localizations.find((localization) => localization.isoCode == "en-US");
        if (enUS != null) {
            enUS.keys.forEach((mapping) => {
                titleIdToTitle[mapping.id] = mapping.text;
            })
        }
    }

    var cardDb = {};
    {
        const data = fs.readFileSync(cardDataPath, 'UTF-8');
        const cards = JSON.parse(data);

        cards.forEach((card) => {
            cardDb[card.grpid] = {
                name: titleIdToTitle[card.titleId],
                metadata: card
            };
        });
    }

    return cardDb;
}

function getMyCards() {
    const logPath = path.join(mtgaData, `Logs\\Logs`);

    const logFilePath = getLatestFile(logPath);
    if (logFilePath == "") {
        return "";
    }

    const data = fs.readFileSync(logFilePath, 'UTF-8');
    const lines = data.split(/\r?\n/);

    var out = [];

    lines.forEach((line) => {
        if (line.includes(`PlayerInventory.GetPlayerCards`)) {
            out.push(line);
        }
    });
    out.sort((a,b) => {
        return b.length - a.length;
    })
    if (out.length == 0) {
        return {};
    }

    var cards = {};
    {
        const log = out[0];
        const firstBrace = log.indexOf("{");
        const lastBrace =  log.lastIndexOf("}");

        const cardListJson = log.substring(firstBrace, lastBrace + 1);
        const cardIdsToCount =  JSON.parse(cardListJson).payload;

        const cardDb = getCardDatabase();
        Object.keys(cardIdsToCount).forEach((cardId) => {
            if (!(cardId in cardDb)) {
                console.log(`Can't find ${cardId}`);
                return;
            }

            const card = cardDb[cardId];

            // Skip basic lands
            if (card.metadata.rarity == 1) {
                return;
            }

            if (card.name in cards) {
                cards[card.name].push({
                    set: card.metadata.set,
                    count: cardIdsToCount[cardId]
                });
            } else {
                cards[card.name] = [{
                    set: card.metadata.set,
                    count: cardIdsToCount[cardId]
                }];
            }
        });
    }
    return cards;
}

fs.writeFileSync("output.json", JSON.stringify(getMyCards()));
