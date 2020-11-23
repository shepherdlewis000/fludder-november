
let d1 = new Date(2018, 1, 2);
let d2 = new Date(2019, 4, 5);
let d3 = new Date(2020, 6, 7);

articles = [{ 
        title: "Robin one Hood",
        subtitle: "Men in Tights",
        txt: "<p><b>This one is bold</b></p><ul><li>One</li><li>Two</li></ul>",
        createdAt: d1,
    }, 
    {
        title: "Boyz N' the Hood",
        subtitle: "Here is one subtitle",
        txt: `<p>Here is some text</p><p>And here's a <a href="http://www.google.com">link</a></p>`,
        createdAt: d2,
    },
    {
        title: "Boy's Life",
        subtitle: "And here is another",
        txt: `<p>Here is one just some text and whatever to put here</p>`,
        createdAt: d3,
    }];

function doSearch(articles, searchField, doTitle, doSubtitle, doText, reverse){
    
    let newArr = []; // rv
    let searchTerms = [];

    searchField.trim().split(" ").forEach(curr => {
        if(curr !== " "){
            searchTerms.push(curr);
        }
    });
    console.log("search terms: ");
    console.log(searchTerms);

    if(doTitle){
        searchTerms.forEach(term => {
            articles.forEach(article => {
                if(article.title.includes(term) && article.alreadyAdded != true){
                    newArr.push(article);
                    article.alreadyAdded = true;
                }
            });
        });
    }

    if(doSubtitle){
        searchTerms.forEach(term => {
            articles.forEach(article => {
                if(article.subtitle.includes(term) && article.alreadyAdded != true){
                    newArr.push(article);
                    article.alreadyAdded = true;
                }
            });
        });
    }

    if(doText){
        searchTerms.forEach(term => {
            articles.forEach(article => {
                if(article.txt.includes(term) && article.alreadyAdded != true){
                    newArr.push(article);
                    article.alreadyAdded = true;
                }
            });
        });
    }

    return newArr;
}

let res = doSearch(articles, "Boy's jkjkkj", true, true, true, false);
console.log(res);

