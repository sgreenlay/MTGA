(function () {
    // Establish the root object, `window` in the browser, or `global` on the server.
    var root = this;

    // Create a reference to this
    var mtga = new Object();

    var runningInNodeJS = false;

    // Export the object for CommonJS, with backwards-compatibility for the old 'require()' API.
    // If we're not in CommonJS, add to the global object.
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = mtga;
        root.mtga = mtga;
        runningInNodeJS = true;
    }
    else {
        root.mtga = mtga;
    }

    mtga.getCardDatabase = function (data_loc, data_cards) {
        var titleIdToTitle = {};

        const localizations = JSON.parse(data_loc);
        const enUS = localizations.find((localization) => localization.isoCode == "en-US");
        if (enUS != null) {
            enUS.keys.forEach((mapping) => {
                titleIdToTitle[mapping.id] = mapping.text;
            })
        }

        var cardDb = {};

        const cards = JSON.parse(data_cards);
        cards.forEach((card) => {
            cardDb[card.grpid] = {
                name: titleIdToTitle[card.titleId],
                metadata: card
            };
        });

        return cardDb;
    };

    mtga.getMyCards = function (data_log, cardDb) {
        const lines = data_log.split(/\r?\n/);

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

        const log = out[0];
        const firstBrace = log.indexOf("{");
        const lastBrace =  log.lastIndexOf("}");

        const cardListJson = log.substring(firstBrace, lastBrace + 1);
        const cardIdsToCount =  JSON.parse(cardListJson).payload;

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

        return cards;
    }
})();