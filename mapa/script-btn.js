const btn_menu = document.querySelector(".btn-menu");
const header = document.querySelector("header");

// Event listener for the menu button
btn_menu.addEventListener("click", e => {

    const state = btn_menu.dataset.state;

    if (state == "burger") {

        btn_menu.dataset.state = "close menu";
        d3.select(".line-top").transition().duration(500)
            .attr("y2", 30);
        d3.select(".line-bottom").transition().duration(500)
            .attr("y2", 10);
        header.classList.add("show-menu");

    } else if (state == "close menu") {

        btn_menu.dataset.state = "burger";
        d3.select(".line-top").transition().duration(500)
            .attr("y2", 10);
        d3.select(".line-bottom").transition().duration(500)
            .attr("y2", 30);
        header.classList.remove("show-menu");

    }

})