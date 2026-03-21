every doc and web dashboard is in chinese

https://search.niftyarchives.org/?keywords=water&categories%5B%5D=gay&subcategories%5B%5D=adult-youth&sort=Relevance&search=
Nifty Archive Search.html is the html for the search result page, above is the url for it.

https://search.niftyarchives.org/?keywords=water&categories%5B0%5D=gay&subcategories%5B0%5D=adult-youth&sort=Relevance&search=&page=2
Nifty Archive Search Page 2.html is the html for the 2nd page of search result page

bookSourceEditConfig.js
bookSourceEditConfig.js contain the setting name and it's chinese display name in the ui

http://192.168.1.71:1122/vue/index.html#/bookSource is the address for the web ui that can add and test book source

新起点legado书源example.json
this is a working example of what the config should look like, it's little long because it have lots of site in it.

书源规则：从入门到入土.html
this is a tutorial for writing book source. 

url on web: https://www.nifty.org/nifty/gay/adult-youth/ash-cloud/  /  file name in I upload: adult-youth_ash-cloud.html
adult-youth_ash-cloud.html is one of the search result that have multiple chapter. It a page with multiple links to said chapter. 

https://www.nifty.org/nifty/gay/adult-youth/ash-cloud/ash-cloud-1
ash-cloud-1.html html when you click the link to the first chapter.

https://www.nifty.org/nifty/gay/adult-youth/swim-at-the-junction
swim-at-the-junction.html is the page for the result that only have one chapter. 

booksource_example_tt1069-webview.json and booksource_example_tt1069-pua.json are working example of book source config

https://github.com/gedoor/legado is link to the source code of the reader app itself

https://github.com/gedoor/legado_web_bookshelf is the web reader

https://github.com/gedoor/legado_web_source_editor is the web book source editor

Observation: 
single chapter book and multi chapter book have different url structure.
search.niftyarchives.org gives search result, nifty.org host the book. there is two web site involved.

goal: 
help the user write settings in the legado书源管理webui. after outputting json, also give the chinese name that match the webui for each setting.

Let's get everything working
搜索 tab should be simple.

发现 should just be the category without search word and newest sort, url: https://search.niftyarchives.org/?keywords=&categories%5B%5D=gay&subcategories%5B%5D=adult-youth&sort=Newest&search=

info needed for 详情 should be in search result page(ie. Nifty Archive Search.html Nifty Archive Search Page2.html)

目录 should accommodate single and multi chapter book.

正文规则 need special treatment, Nifty Archive Search Page(search.niftyarchives.org)'s result leads to nifty.org.

And Don't add [] on the root level, the root level should be the {}

