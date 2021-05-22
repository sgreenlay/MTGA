const fs = require("fs");
const path = require('path');
const mtga = require('./mtga');

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

    const data_loc = fs.readFileSync(locDataPath, 'UTF-8');
    const data_cards = fs.readFileSync(cardDataPath, 'UTF-8');

    return mtga.getCardDatabase(data_loc, data_cards);
}

function getMyCards() {
    const logPath = path.join(mtgaData, `Logs\\Logs`);

    const logFilePath = getLatestFile(logPath);
    if (logFilePath == "") {
        return "";
    }

    const data_log = fs.readFileSync(logFilePath, 'UTF-8');

    return mtga.getMyCards(data_log, getCardDatabase());
}

fs.writeFileSync("output.json", JSON.stringify(getMyCards()));
