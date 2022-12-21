const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const Scratch3DataBlocks = require('../../blocks/scratch3_data');

class CambrianDecksExtension {

  constructor (runtime, window, extensionId) {
    this.runtime = runtime;
    this.window = window;
  }

  getInfo() {
    return {
      "id": 'cambrianDecks',
      "name": 'Cambrian Decks',
      "blocks": [
        {
          "opcode": 'loadDeck',
          "blockType": BlockType.COMMAND,
          text: formatMessage({
              id: 'cambrian.decks.loadDeck',
              default: 'load deck from project id [PROJECT_ID] into list [LIST_NAME] and shuffle [SHUFFLE]',
              description: 'loads the first deck from the project with the given id'
          }), 
          "arguments": {
            PROJECT_ID: {
              type: ArgumentType.NUMBER,
              defaultValue: 0,
            },
            LIST_NAME: {
              type: ArgumentType.STRING,
              defaultValue: 'All Cards',
            },
            SHUFFLE: {
              type: ArgumentType.STRING,
              defaultValue: 'True'
            }
          },
        },
        {
          "opcode": 'getCardCategories',
          "blockType": BlockType.REPORTER,
          text: formatMessage({
              id: 'cambrian.decks.cardCategories',
              default: 'categories for [CARD]',
              description: 'get a list of card categories for a card'
          }), 
          "arguments": {
            CARD: {
              type: ArgumentType.STRING,
            },
          },
        },
        {
          "opcode": 'compareCardsOnCategory',
          "blockType": BlockType.REPORTER,
          text: formatMessage({
              id: 'cambrian.decks.compareCardsOnCategories',
              default: 'compare [CARD1] and [CARD2] on [CATEGORY_ID]',
              description: 'compare the cards on the given category. Returns -1, 0, 1'
          }), 
          "arguments": {
            CARD1: {
              type: ArgumentType.STRING,
            },
            CARD2: {
              type: ArgumentType.STRING,
            },
            CATEGORY_ID: {
              type: ArgumentType.STRING,
            },
          },
        },
        {
          "opcode": 'getCardName',
          "blockType": BlockType.REPORTER,
          text: formatMessage({
              id: 'cambrian.decks.getCardName',
              default: 'card name [CARD]',
              description: 'Gets the name of the card'
          }), 
          "arguments": {
            CARD: {
              type: ArgumentType.STRING,
            },
          },
        },
         
      ]
    };
  };
  
  loadDeck(args) {
    // const deckHost = "http://localhost:3030/scratch"
    const deckHost = "https://cambrian-gg.herokuapp.com/scratch"
    try {
      const projectId = Cast.toNumber(args.PROJECT_ID)
      const deckListName = Cast.toString(args.LIST_NAME)
      const shuffle = Cast.toString(args.SHUFFLE) == 'True'
      const categoriesListName = Cast.toString("Categories");
      const promise = new Promise((resolve, reject)=> {
        fetch(`${deckHost}/decks?project_id=${projectId}`).then((response)=> {
          return response.json()
        }).then((json)=> {
          const deckList = this.runtime.targets[0].lookupOrCreateList(
            `cambrian.decks.${deckListName}`, deckListName);
          const deck = json[0]
          const categoryValues = json[0].cards[0].categoryValues.map(v=> `${v.categoryId}:${v.value}`).join(",")
          const cards = deck.cards;
          if(shuffle) {
            this.shuffleArray(deck.cards)
          }
          cards.forEach((card) => {
            if (deckList.value.length < Scratch3DataBlocks.LIST_ITEM_LIMIT) {
                deckList.value.push(`${JSON.stringify(card)}`);
                deckList._monitorUpToDate = false;
            }
          })
          const categoriesList = this.runtime.targets[0].lookupOrCreateList(
            `cambrian.decks.${categoriesListName}`, categoriesListName)
          deck.categories.forEach((category)=> {
            if(categoriesList.value.length < Scratch3DataBlocks.LIST_ITEM_LIMIT) {
              categoriesList.value.push(`${JSON.stringify(category)}`);
            }
          })
          // const variable = this.runtime.targets[0].lookupOrCreateVariable(`cambrian.decks.allCategoriesString`, "All Categories")
          // variable.value = deck.categories.map(c=> c.name).join(",");
        })
      })
      Promise.all([promise]).then(()=> {
        console.log("completed")
      }).catch(()=> {
        console.log("error")
      })
    } catch(e) {
      console.error("Error:", e);
    }
  }

  getCardCategories(args) {
    const card = JSON.parse(Cast.toString(args.CARD))
    return card.categoryValues.map(cv=> `${cv.categoryId}-${cv.categoryName}:${cv.value}`).join("\n")
  }

  compareCardsOnCategory(args) {
    const card1 = JSON.parse(Cast.toString(args.CARD1))
    const card2 = JSON.parse(Cast.toString(args.CARD2))
    const categoryId = Cast.toString(args.CATEGORY_ID)

    const categoryValue1 = card1.categoryValues.filter(cv=> cv.categoryId == categoryId)[0]
    if(categoryValue1 == null) {
      console.error(`There is no category with id: ${categoryId}`)
    }
    const value1 = categoryValue1.value
    const value2 = card2.categoryValues.filter(cv=> cv.categoryId == categoryId)[0].value
    return parseInt(value1,10)-parseInt(value2, 10)
  }

  getCardName(args) {
    return JSON.parse(Cast.toString(args.CARD))["name"]
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }
};


module.exports = CambrianDecksExtension;