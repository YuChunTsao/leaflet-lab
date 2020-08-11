// Leaflet Docs: https://leafletjs.com/reference-1.6.0.html
window.onload = async function () {
    let initCenter = L.latLng(25.017386, 121.540489);
    let initZoom = 13;
    let map = L.map('mapDiv', {
        center: initCenter,
        zoom: initZoom,
        /**
         * 控制預設圖層顯示
         * 如果是底圖的話，選擇其中一個就好。
         * 可以開啟不同的圖層進行疊圖展示
         */
        layers: [basemaps.EMAP]
    })
    /**
     * 圖層控制
     * https://leafletjs.com/reference-1.6.0.html#layer
     * 區分為bashlayer及overlay
     * 可以透過addBaseLayer,addOverlay動態加入圖層
     */

    let busStations = await getBusStations()
    /**
     * Cluster功能(https://github.com/Leaflet/Leaflet.markercluster)
     * 以此公車站牌API為例，共有27678筆點資料，若是將所有的點直接展示於地圖上時，
     * 將會導致載入緩慢以及操作上的延遲問題，甚至導致使用者瀏覽器無法回應。
     * 該套件提供相當多的選項可自行定義，可再依照需求進行變更。
     */
    // cluster功能
    let markers = L.markerClusterGroup();
    markers.addLayer(busStations);

    // 將cluster圖層加入地圖中
    map.addLayer(markers)

    // 製作overlayer
    let overlayer = {
        // 可以有多個疊加層
        "overlayer": markers
    }
    // 於地圖控制項中加入basemap及overlayer
    L.control.layers(basemaps, overlayer).addTo(map);
}

/**
 * 可以自行加入所需要的底圖
 * 可參考https://leaflet-extras.github.io/leaflet-providers/preview/
 * 也可以使用國土測繪中心、歷史百年地圖等等相關的圖磚服務
 * 不同的圖磚服務所擁有的最大階層可能不同，若是圖磚服務是由自行建立，可依照需求來設定，甚至發布為向量圖磚進行使用。
 */

// 匿名函數與IIFE (https://eyesofkids.gitbooks.io/javascript-start-from-es6/content/part3/function_scope.html#%E5%8C%BF%E5%90%8D%E5%87%BD%E5%BC%8F%E8%88%87iife)
let basemaps = (function () {
    return {
        "OSM": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),
        // Leaflet-providers preview (https://leaflet-extras.github.io/leaflet-providers/preview/)
        "CartoDB_Voyager": L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }),
        /**
         * 國土測繪圖資服務雲 (https://maps.nlsc.gov.tw/S09SOA/)
         * epsg:3857: https://wmts.nlsc.gov.tw/wmts
         * epsg:3826(TWD97): https://wmts.nlsc.gov.tw/97/wmts
         */
        // 通用版電子地圖
        "EMAP": L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
            attribution: '© <a href="https://maps.nlsc.gov.tw/S09SOA/">國土測繪中心</a> contributors'
        }),
        // 土地利用調查
        "LUIMAP": L.tileLayer('https://wmts.nlsc.gov.tw/wmts/LUIMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
            attribution: '© <a href="https://maps.nlsc.gov.tw/S09SOA/">國土測繪中心</a> contributors'
        })
    }
})()

async function getBusStations() {
    // 台北市公車站牌位置
    let url = "https://ptx.transportdata.tw/MOTC/v2/Bus/Stop/City/Taipei?$format=JSON"

    let layerGroup;
    let status = null;
    try {
        /**
         * await 用來等待一個Promise(承諾)
         * https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Statements/async_function
         * https://developers.google.com/web/fundamentals/primers/async-functions
         * https://wcc723.github.io/javascript/2017/12/30/javascript-async-await/
         */
        let response = await fetch(url)
        let result = await response.json()
        layerGroup = await createLayerGroup(result)
        status = true;
    }
    catch (error) {
        // 假如過程中發生錯誤想要執行的動作放這邊
        console.log(error)
        status = false
    }

    return new Promise((resolve, reject) => {
        if (status) {
            // 成功回傳資料，可以設計回傳的資料格式。
            resolve(layerGroup)
        }
        else {
            // 可以依照需求設計失敗時所需要回傳的格式。
            reject(status)
        }
    })
}

async function createLayerGroup(stations) {
    let markerList = []
    for (let i = 0; i < stations.length; i++) {
        // 將api資料製作成leaflet marker
        let latlng = L.latLng(stations[i].StopPosition.PositionLat, stations[i].StopPosition.PositionLon)
        /**
         * 這種嵌入式popup製作方式若是內容較複雜時，可能較難撰寫及維護。
         * 且popup window顯示於地圖上有可以會遮蔽其他所想要呈現的地圖畫面，因此可以依照專案需求來進行不同的設計。
         * 其他的設計方式，將空間資料的屬性，於使用者針對該空間資料進行點擊時(或其他觸發事件)，將屬性資料於側欄顯示。
         */
        let content = `
        <div>
            <h3>站牌名稱：${stations[i].StopName.Zh_tw}</h3>
            <h3>停車點描述：${stations[i].StopAddress}<h3>
        </div>
        `
        let marker = L.marker(latlng).bindPopup(content)
        markerList.push(marker)
    }
    return L.layerGroup(markerList);
}