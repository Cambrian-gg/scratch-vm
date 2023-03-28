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
              default: 'load deck into list [LIST_NAME] and shuffle [SHUFFLE]',
              description: 'loads the first deck from the project'
          }), 
          "arguments": {
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
              default: 'card to text [CARD]',
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
              default: 'compare [CARD1] and [CARD2] on [CATEGORY_POSITION]',
              description: 'compare the cards on the given category. Returns -1, 0, 1'
          }), 
          "arguments": {
            CARD1: {
              type: ArgumentType.STRING,
            },
            CARD2: {
              type: ArgumentType.STRING,
            },
            CATEGORY_POSITION: {
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
        {
          "opcode": 'getCategoryValue',
          "blockType": BlockType.REPORTER,
          text: formatMessage({
              id: 'cambrian.decks.categoryValue',
              default: 'category value [CARD] [CATEGORY_POSITION]',
              description: 'get the value for the category in the given position'
          }),
          "arguments": {
            CARD: {
              type: ArgumentType.STRING,
            },
            CATEGORY_POSITION: {
              type: ArgumentType.STRING
            }
          },
        },
         
      ]
    };
  };
  
  loadDeck(args) {
    const deckHost = this.runtime.cambrian.decksHost;
    try {
      const projectId = Cast.toNumber(this.runtime.cambrian.projectId)
      const deckListName = Cast.toString(args.LIST_NAME)
      const shuffle = Cast.toString(args.SHUFFLE) == 'True'
      const categoriesListName = Cast.toString("Categories");
      const promise = new Promise((resolve, reject)=> {
        fetch(`${deckHost}/decks?game_id=${projectId}`).then((response)=> {
          return response.json()
        }).then((json)=> {
          const deckList = this.runtime.targets[0].lookupOrCreateList(
            `cambrian.decks.${deckListName}`, deckListName);
          const deck = json[0]
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
    const categories = this.getOrderedCategoryValues(card).map((cv, index)=> `${index+1}-${cv.categoryName}:${cv.value}`).join("\n")
    return ["",card.name,categories,""].join("\n")
  }

  compareCardsOnCategory(args) {
    const card1 = JSON.parse(Cast.toString(args.CARD1))
    const card2 = JSON.parse(Cast.toString(args.CARD2))
    const categoryPosition = Cast.toString(args.CATEGORY_POSITION)
    const categoryIndex = categoryPosition - 1
    const categoryValue1 = this.getOrderedCategoryValues(card1)[categoryIndex]
    if(categoryValue1 == null) {
      console.error(`There is no category with position: ${categoryPosition}`)
    }
    const value1 = categoryValue1.value
    const value2 = this.getOrderedCategoryValues(card2)[categoryIndex].value
    return parseFloat(value1)-parseFloat(value2)
  }

  getCardName(args) {
    // FIXME: Extract this logic for card to costume name in a util
    const card = JSON.parse(Cast.toString(args.CARD))
    return `card-${card["id"]}-${card["name"]}`
  }

  getCategoryValue(args) {
    const card = JSON.parse(Cast.toString(args.CARD))
    const categoryPosition = JSON.parse(Cast.toString(args.CATEGORY_POSITION))

    return this.getOrderedCategoryValues(card)[categoryPosition-1].value
  }

  /**
   * Make sure that we always have the categoryValues sorted
   * This might not be needed in the long run but adding it here as a
   * guard, until we have proper specs on this
   */
  getOrderedCategoryValues(card) {
    return card.categoryValues.sort((card1, card2)=> Cast.toNumber(card1.categoryId) - Cast.toNumber(card2.categoryId))
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