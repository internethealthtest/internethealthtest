/*jslint bitwise: true, browser: true, nomen: true, vars: true, indent: 2 */
/*global Uint8Array, NDTjs, $, Spinner */

'use strict';

function InternetHealthTest() {

  this.uaParser = new UAParser();
  this.uaInformation = this.uaParser.getResult();
  this.serverQueue = [];
  this.serverList = [];
  this.resultList = {};
  this.siteMap = {};
  this.isRunning = false;
  this.canvas = $('.canvas');
  this.lastStateChange = undefined;
  this.mlabNsAnwer = undefined;
  this.historicalData = [];
  this.shareableResults = {};
  this.currentServer = undefined;

  // NDT's Test Length in milliseconds
  this.NDT_TEST_LENGTH = 10000;
  this.LOCALSTORAGE_KEY = 'historicalData';

  this.NDT_STATUS_LABELS = {
    'preparing_s2c': 'Download',
    'preparing_c2s': 'Upload',
    'running_s2c': 'Download',
    'running_c2s': 'Upload',
    'finished_s2c': 'Download',
    'finished_c2s': 'Upload',
    'preparing_meta': 'Metadata',
    'running_meta': 'Sending',
    'finished_meta': 'Finished',
    'finished_all': 'Complete'
  };
  this.RESULTS_TO_DISPLAY = {
    's2cRate': 'Download',
    'c2sRate': 'Upload',
    'MinRTT': 'Latency',
    'packetRetransmissions': 'Retransmissions'
  };
  this.domObjects = {
    'intro_overlay': this.canvas.find('.intro_overlay'),
    'intro_overlay_icon': this.canvas.find('.intro_overlay .intro_overlay_icon'),
    'intro_results': this.canvas.find('.intro_overlay .shared_results'),
    'share_overlay': this.canvas.find('.share_overlay'),
    'share_results': this.canvas.find('.share_overlay .share_results__table'),
    'advanced_results': this.canvas.find('.share_overlay .share_results__advanced_table'),
    'about_overlay': this.canvas.find('.about_overlay'),
    'about_overlay__mobile_warning': this.canvas.find('.intro_overlay  .ui-grid-a .ui-block-a'),
    'embed_overlay': this.canvas.find('.embed_overlay'),
    'performance_meter': this.canvas.find('.performance_meter'),
    'performance_meter_objects': this.canvas.find('.performance_meter div'),
    'dashboard': this.canvas.find('.dashboard__result_list'),
    'result_list': this.canvas.find('.dashboard__result_list .ui-listview'),
    'result_list_item': this.canvas.find('.dashboard__result_list .ui-listview li'),
    'start_button': this.canvas.find('.dashboard__start_button'),
    'server_list': this.canvas.find('.select__server_location'),
    'historical_information': this.canvas.find('.historical_information'),
    'about_button': this.canvas.find('.intro_overlay_about'),
    'embed_button': this.canvas.find('.intro_overlay_embed'),
    'supported_browser_dialogue': this.canvas.find('.supported_browser_dialogue'),
    'measurement_panel': this.canvas.find('.panel__measurement_results'),
    'measurement_panel_list': this.canvas.find('.panel__measurement_results  .ui-listview')
  };
  this.spinnerOpts = {
    lines: 13, // The number of lines to draw
    length: 20, // The length of each line
    width: 3, // The line thickness
    radius: 8, // The radius of the inner circle
    corners: 1, // Corner roundness (0..1)
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    color: '#000', // #rgb or #rrggbb or array of colors
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    className: 'spinner', // The CSS class to assign to the spinner
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    top: '50%', // Top position relative to parent
    left: '120px' // Left position relative to parent
  };
  this.isStorageSupported = this.isLocalStorageNameSupported();
  this.clientInformation = {
    'client.os.name': this.uaInformation.os.name + " " + this.uaInformation.os.version,
    'client.browser.name': this.uaInformation.browser.name + "/" + this.uaInformation.browser.version,
    'client.version': '3.7.0'
  };
  this.setupInterface();
}

InternetHealthTest.prototype.setupInterface = function () {
  var that = this;
  var autoStart = false;
  var shareableInformation;
  var intervalListener;

  if (this.isMobile() === true) {
    this.domObjects.about_overlay__mobile_warning.addClass('mobile_warning');
  }

  this.domObjects.intro_overlay.popup();
  this.domObjects.about_overlay.popup();
  this.domObjects.embed_overlay.popup();
  this.domObjects.start_button.button();

  if (this.checkBrowserSupport() === true) {

    this.domObjects.start_button.button('enable');
    this.domObjects.start_button.focus();
    this.domObjects.performance_meter.percentageLoader({value: 'Upload'});
    this.domObjects.performance_meter.find('div div').text('Start');
    this.domObjects.performance_meter.addClass('test_control_enabled');

    $.merge(this.historicalData, this.getlocalStorage());
    this.populateHistoricalData(this.historicalData);

    this.domObjects.start_button.click(function () {
      that.domObjects.intro_overlay.popup('close');
      if (Object.keys(that.resultList).length > 0 || Object.keys(that.shareableResults).length > 0) {
        that.resetDashboard();
      }
      that.domObjects.performance_meter.find('.percentage_text').addClass('smallertext');
      that.domObjects.performance_meter.find('div div').text('Preparing');
      intervalListener = window.setInterval( function () {
          if (that.serverList.length > 0) {
              window.clearInterval(intervalListener);
              that.runServerQueue();
          }
      }, 500);
    });
    this.domObjects.performance_meter.find('div').first().click(function () {
      if (that.domObjects.performance_meter.hasClass('test_control_enabled') === true) {
        if (Object.keys(that.resultList).length > 0) {
          that.resetDashboard();
        }
        that.runServerQueue();
      }
    });

    this.domObjects.about_button.click(function () {
      that.domObjects.about_overlay.popup('open');
    });
    this.domObjects.embed_button.click(function () {
      that.domObjects.embed_overlay.popup('open');
    });

    if (url('?start') !== null) {
        autoStart = true;
        this.domObjects.intro_overlay.popup('close');
        this.domObjects.performance_meter.find('.percentage_text').addClass('smallertext');
        this.domObjects.performance_meter.find('div div').text('Preparing');
        intervalListener = window.setInterval( function () {
            if (that.serverList.length > 0) {
                window.clearInterval(intervalListener);
                that.runServerQueue();
            }
        }, 500);
    }

    if (url('?t') !== null) {
      this.shareableResults = this.unpackageShareableResults(url('?t'));
      if (Object.keys(that.shareableResults).length > 0) {
        shareableInformation = this.processShareableResults(this.shareableResults);
        this.notifyShareableResults(shareableInformation, true);
        this.notifyShareableLink(url(), false);
        this.domObjects.about_overlay__mobile_warning.removeClass('mobile_warning');
        this.domObjects.start_button.val('Run Your Own Test!').button('refresh');
        //this.domObjects.intro_overlay_icon.hide();
        this.domObjects.share_overlay.show();
      }
    }
    if ((that.historicalData.length === 0 && Object.keys(this.shareableResults).length === 0) && autoStart === false ) {
      window.setTimeout( function () {
        that.domObjects.intro_overlay.popup('open');
        console.log('rawr');
        if (Object.keys(that.shareableResults).length > 0) {
          //that.createChart(that.shareableResults, true);
        }
      }, 1000);
    }
  } else {
    this.domObjects.supported_browser_dialogue.popup();
    this.domObjects.supported_browser_dialogue.popup('open');
  }
};

InternetHealthTest.prototype.checkBrowserSupport = function () {
  var self = this;

  if (WebSocket === undefined && self.WebSocket === undefined && self.MozWebSocket === undefined) {
    return false;
  }
  return true;
};

InternetHealthTest.prototype.isLocalStorageNameSupported = function () {
  var testKey = 'historicalDataTestKey';

  try {
    window.sessionStorage.setItem(testKey, '1');
    window.sessionStorage.removeItem(testKey);
    return true;
  }
  catch (error) {
    return false;
  }
};

InternetHealthTest.prototype.getlocalStorage = function () {
  var historicalDataString = localStorage.getItem(this.LOCALSTORAGE_KEY);
  if (historicalDataString !== undefined && historicalDataString !== null) {
    return JSON.parse(historicalDataString);
  }
  return [];
};

InternetHealthTest.prototype.setlocalStorage = function (historicalData) {
  var historicalDataString = JSON.stringify(historicalData);
  localStorage.setItem(this.LOCALSTORAGE_KEY, historicalDataString);
};

InternetHealthTest.prototype.populateHistoricalData = function (historicalData) {
  var historicalDataSize = 'Past Tests (' + historicalData.length + ')';
  this.domObjects.historical_information.text(historicalDataSize);
};

InternetHealthTest.prototype.shortenLink = function (sharedUrl) {
  var that = this;
  var accessToken = "24fd574f4058fd5ec46392243c21eb3e9d1915a8";

  $.ajax({
    url: "https://api-ssl.bitly.com/v3/shorten",
    data: {'longUrl': sharedUrl, 'access_token': accessToken},
    dataType:"jsonp",
    success: function(v) {
        that.notifyShareableLink(v.data.url, false);
        return v.data.url;
      }
    });
}


InternetHealthTest.prototype.findLocalServers = function (allServers) {
  var mlabNsRequest = new XMLHttpRequest(),
    mlabNsUrl = 'http://mlab-ns.appspot.com/ndt?format=json&policy=geo',
    that = this;

  mlabNsRequest.onreadystatechange = function () {
    if (mlabNsRequest.readyState === 4) {
      if (mlabNsRequest.status === 200) {
        that.mlabNsAnwer = JSON.parse(mlabNsRequest.responseText);
        that.mlabNsAnwer.metro = that.mlabNsAnwer.site.slice(0, 3);
        that.findMoreServers(allServers, that.mlabNsAnwer);
      }
    }
  };
  mlabNsRequest.open("GET", mlabNsUrl, true);
  mlabNsRequest.send();
};

InternetHealthTest.prototype.findAllServers = function () {
  var mlabNsRequest = new XMLHttpRequest(),
    mlabNsUrl = 'http://mlab-ns.appspot.com/ndt?format=json&policy=all',
    that = this;

  mlabNsRequest.onreadystatechange = function () {
    if (mlabNsRequest.readyState === 4) {
      if (mlabNsRequest.status === 200) {
        that.mlabNsAnwer = JSON.parse(mlabNsRequest.responseText);
        that.findLocalServers(that.mlabNsAnwer);;
      }
    }
  };
  mlabNsRequest.open("GET", mlabNsUrl, true);
  mlabNsRequest.send();
};

InternetHealthTest.prototype.populatePanelData = function (siteId) {
  var testResultItem, testResultValueString, testResultValue;

  this.domObjects.measurement_panel_list.find('li').remove();
  testResultItem = $('<li>').text("Transit");
  testResultItem.append($('<span>')
    .addClass('ui-li-count')
    .text(this.resultList[siteId].metadata.transit));
  this.domObjects.measurement_panel_list.append(testResultItem);

  for (testResultValue in this.RESULTS_TO_DISPLAY) {
    if (this.RESULTS_TO_DISPLAY.hasOwnProperty(testResultValue)) {
      testResultValueString = this.formatMeasurementResult(testResultValue,
        this.resultList[siteId][testResultValue]);
      testResultItem = $('<li>').text(this.RESULTS_TO_DISPLAY[testResultValue]);
      testResultItem.append($('<span>')
        .addClass('ui-li-count')
        .text(testResultValueString));
      this.domObjects.measurement_panel_list.append(testResultItem);
    }
  }
  this.domObjects.measurement_panel_list.listview().listview('refresh');
}

InternetHealthTest.prototype.findMoreServers = function (allServers, localServer) {
  var mlabSiteListRequest = new XMLHttpRequest();
  var mlabSiteListURL = "resources/datasets/site_list.json";
  var that = this;
  var constructedRecord;

  mlabSiteListRequest.open("GET", mlabSiteListURL, true);
  mlabSiteListRequest.onload = function () {
    if (mlabSiteListRequest.status === 200) {
      that.siteMap = that.parseSiteMap(mlabSiteListRequest.responseText);
      that.serverList = that.parseServerList(allServers, that.siteMap, localServer.metro);
      if (that.serverList.length === 0) {
        constructedRecord = that.parseSiteRecord(localServer);
        that.serverList.push(constructedRecord);
      }
      that.notifyServerListUpdate(that.serverList);
    }
  };
  mlabSiteListRequest.send();
};

InternetHealthTest.prototype.parseSiteMap = function (responseText) {
  var siteList = JSON.parse(responseText);
  var siteMap = {}

  siteList.forEach(function (siteRecord) {
    siteMap[siteRecord.site] = siteRecord.transit;
  });

  return siteMap;
};

InternetHealthTest.prototype.parseServerList = function (allServers, siteMap, metro) {
  var that = this;

  if (allServers !== undefined) {
    allServers.forEach(function (siteRecord) {
      if (siteRecord.site.slice(0, 3) === metro) {
        if (siteMap.hasOwnProperty(siteRecord.site) === true) {
          siteRecord.transit = siteMap[siteRecord.site];
        }
        that.serverList.push(that.parseSiteRecord(siteRecord));
      }
    });
  }
  this.serverList = this.shuffleArray(this.reduceDuplicates(this.serverList));
  return this.serverList;
};

InternetHealthTest.prototype.reduceDuplicates = function (serverList) {
  var serverMap = {};
  var uniqueServerList = [];
  var i;

  serverList.forEach(function (serverRecord) {
    if (serverMap.hasOwnProperty(serverRecord.site) === false) {
      serverMap[serverRecord.site] = [];
    }
    serverMap[serverRecord.site].push(serverRecord);
  });

  for (var i in serverMap) {
    if (serverMap.hasOwnProperty(i)) {
      uniqueServerList.push(serverMap[i][Math.floor(Math.random()*serverMap[i].length)]);
    }
  }
  return uniqueServerList;
};

InternetHealthTest.prototype.parseSiteRecord = function (siteRecord) {
  var transitValue;

  if (siteRecord.hasOwnProperty('transit') === true) {
    transitValue = siteRecord.transit;
  } else {
    transitValue = siteRecord.city;
  }

  return {
    address: siteRecord.fqdn,
    port: Number('3001'),
    transit: transitValue,
    path: '/ndt_protocol',
    site: siteRecord.site,
    id: (siteRecord.site + '_' + siteRecord.transit).replace(' ', '_')
  };
};

InternetHealthTest.prototype.runServerQueue = function () {
  var currentServer;
  this.serverQueue = this.serverList.slice();
  this.notifyServerQueueStart();
  if (this.serverQueue.length > 0 && this.isRunning === false) {
    currentServer = this.serverQueue.shift();
    this.runTest(currentServer);
    return true;
  }

  return false;
};

InternetHealthTest.prototype.runTest = function (currentServer) {
  this.ndtClient = new NDTjs(currentServer.address,
      currentServer.port, currentServer.path, this, 100);
  this.ndtClient.metaInformation = this.clientInformation;

  try {
    this.ndtClient.checkBrowserSupport();
  } catch(thrownError) {
    this.domObjects.supported_browser_dialogue.popup('open');
  }

  this.ndtClient.results.metadata = currentServer;
  this.ndtClient.results.siteId = currentServer.id;
  this.notifyTestStart(currentServer);
  this.currentServer = currentServer;

  this.ndtClient.startTest();
  this.isRunning = true;
};

InternetHealthTest.prototype.onstart = function () { return false; };

InternetHealthTest.prototype.onstatechange = function (currentState,
        passedResults) {
  this.lastStateChange = Date.now();
  this.notifyStateChange(currentState, passedResults);
};

InternetHealthTest.prototype.onprogress =  function (currentState,
        passedResults) {
  var timeLapsed = Date.now() - this.lastStateChange;
  this.notifyTestProgress(currentState, passedResults.siteId,
    timeLapsed, passedResults);
};

InternetHealthTest.prototype.onfinish = function (passedResults) {
  var currentServer, shareableInformation;

  passedResults.packetRetransmissions = Number(passedResults['PktsRetrans']) /
    Number(passedResults['PktsOut']);
  this.resultList[passedResults.siteId] = passedResults;
  this.historicalData.push(passedResults);

  if (this.isStorageSupported === true) {
    this.setlocalStorage(this.historicalData);
  }

  this.notifyTestCompletion(passedResults.siteId, passedResults);

  if (this.serverQueue.length > 0) {
    currentServer = this.serverQueue.shift();
    this.runTest(currentServer);
  } else {
    this.shareableResults = this.packageShareableResults(this.resultList);
    shareableInformation = this.processShareableResults(this.shareableResults);
    shareableInformation.link = 'http://www.internethealthtest.org/?t=' + this.encodeShareableResults(this.shareableResults);
    this.notifyShareableResults(shareableInformation, false);
    this.notifyServerQueueCompletion(shareableInformation);
    this.isRunning = false;
  }
};

InternetHealthTest.prototype.onerror = function (passedError) {
  var currentServer, shareableInformation;

  this.notifyTestError(this.currentServer);

  if (this.serverQueue.length > 0) {
    currentServer = this.serverQueue.shift();
    this.runTest(currentServer);
  } else {
    this.shareableResults = this.packageShareableResults(this.resultList);
    shareableInformation = this.processShareableResults(this.shareableResults);
    shareableInformation.link = 'http://www.internethealthtest.org/?t=' + this.encodeShareableResults(this.shareableResults);
    this.notifyShareableResults(shareableInformation, false);
    this.notifyServerQueueCompletion(shareableInformation);
    this.isRunning = false;
  }
};

InternetHealthTest.prototype.notifyTestStart = function (currentServer) {
  this.changeRowIcon(currentServer.id, 'recycle', 'testing');
  this.changeRowHighlight(currentServer.id, true);
};

InternetHealthTest.prototype.notifyTestError = function (currentServer) {
  this.changeRowIcon(currentServer.id, 'forbidden', 'testing');
  this.changeRowHighlight(currentServer.id, true);
};


InternetHealthTest.prototype.notifyShareableLink = function (shareableInformation_link, introOverlay) {
  var targetOverlay;
  introOverlay = introOverlay || false;

  if (introOverlay === true) {
    targetOverlay = this.domObjects.share_overlay;
  } else {
    targetOverlay = this.domObjects.share_overlay;
  }

  targetOverlay.find('.result_url_share').val(shareableInformation_link);
  targetOverlay.find('.result_url_share').trigger('create');
};


InternetHealthTest.prototype.notifyShareableResults = function (shareableInformation, introOverlay) {
  introOverlay = introOverlay || false;
  var targetOverlay, targetOverlayResults;
  var self = this;

  if (introOverlay === true) {
    targetOverlay = this.domObjects.share_overlay;
    targetOverlayResults = this.domObjects.share_results;
  } else {
    targetOverlay = this.domObjects.share_overlay;
    targetOverlayResults = this.domObjects.share_results;
  }
  targetOverlayResults.find('.consistency span')
    .addClass(shareableInformation.consistency)
    .text(shareableInformation.consistency);

  targetOverlayResults.find('.average span')
      .text(this.formatMeasurementResult('c2sRate', shareableInformation.mean));
  targetOverlayResults.find('.high span')
    .text(this.formatMeasurementResult('c2sRate', shareableInformation.high));
  targetOverlayResults.find('.low span')
    .text(this.formatMeasurementResult('c2sRate', shareableInformation.low));

  targetOverlayResults.find('.slow_links').hide();
  if (shareableInformation.slow_links.length === 0) {
    targetOverlayResults.find('.slow_links').hide();
  } else if (shareableInformation.slow_links.length === 1) {
    // targetOverlayResults.find('.slow_links').show();
    targetOverlayResults.find('.slow_links').text('Potential slow down found on one connection.');
  } else if (shareableInformation.slow_links.length > 1) {
    // targetOverlayResults.find('.slow_links').show();
    targetOverlayResults.find('.slow_links small').text('Potential slow downs found on ' + shareableInformation.slow_links.length + ' connections.');
  }

  shareableInformation.measurements.forEach(function(measurement) {
    var temporaryRow = $("<li>")
      .text(measurement[0]); //
    temporaryRow.append($("<span>")
      .addClass('ui-li-count')
      .addClass('ui-body-inherit')
      .text(self.formatMeasurementResult('c2sRate', measurement[1]))); //
    self.domObjects.advanced_results.append(temporaryRow);
  });
  this.domObjects.advanced_results.listview('refresh');

  if (shareableInformation.link !== undefined) {
    this.notifyShareableLink(shareableInformation.link, false);
    //this.shortenLink(shareableInformation.link);
  }
  this.domObjects.dashboard.hide();
  targetOverlayResults.show();
};

InternetHealthTest.prototype.processShareableResults = function (shareableResults) {
  var that = this;
  var allResults = [];
  var shareableInformation = {
    'high': undefined,
    'median': undefined,
    'mean': undefined,
    'low': undefined,
    'rsdeviation': undefined,
    'consistency': undefined,
    'slow_links': [],
    'time_run': shareableResults.time_run,
    'measurements': []
  };

  shareableResults.results.forEach(function (sharedResult) {
    if (shareableInformation.high === undefined ||
        sharedResult.s2cRate > shareableInformation.high) {
      shareableInformation.high = sharedResult.s2cRate;
    }
    if (shareableInformation.low === undefined ||
        sharedResult.s2cRate < shareableInformation.low) {
      shareableInformation.low = sharedResult.s2cRate;
    }
    shareableInformation.measurements.push([sharedResult.siteTransit,
        sharedResult.s2cRate, sharedResult.c2sRate])
    allResults.push(sharedResult.s2cRate);
  });

  shareableInformation.mean = (allResults.reduce(function(a, b) { return a + b; }) / allResults.length);
  shareableInformation.median = findMedian(allResults);
  shareableInformation.rsdeviation = (standardDeviation(allResults) / shareableInformation.mean);

  if (shareableInformation.rsdeviation > 0.8) {
    shareableInformation.consistency = 'poor';
  } else if (shareableInformation.rsdeviation > 0.4) {
    shareableInformation.consistency = 'fair';
  } else if (shareableInformation.rsdeviation > 0.2) {
    shareableInformation.consistency = 'good';
  } else {
    shareableInformation.consistency = 'high';
  }

  shareableResults.results.forEach(function (sharedResult, index) {
    if (sharedResult.s2cRate < (shareableInformation.mean * .6) ) {
      shareableInformation.slow_links.push(sharedResult.siteId);
    }
  });

  return shareableInformation;
}

InternetHealthTest.prototype.unpackageShareableResults = function (passedString) {
  var sharedResultObject;

  if (passedString.slice(-1) === '/') {
    passedString = passedString.slice(0, (passedString.length - 1))
  }
  try {
    sharedResultObject = JSON.parse(decodeURIComponent(escape(window.atob(passedString))));
  } catch (error) {
    return {};
  }
  return sharedResultObject;
};

InternetHealthTest.prototype.createChart = function (shareableResults, introOverlay) {
  introOverlay = introOverlay || false;
  var chartContext, chartObject, chartDatasets, chartOptions, chartData, chartLabels;
  var targetOverlayResults;

  if (introOverlay === true) {
    targetOverlayResults = this.domObjects.intro_results;
  } else {
    targetOverlayResults = this.domObjects.share_results;
  }

  chartLabels = $.map(shareableResults.results, function (shareableResult, index) {
    return '' //"Test " + index;
  });
  chartData = $.map(shareableResults.results, function (shareableResult, index) {
    return Number(shareableResult.s2cRate / 1000).toFixed(2);
  });

  chartContext = targetOverlayResults.find(".test_series_chart").get(0).getContext("2d");
  chartData = {
      labels: chartLabels,
      datasets: [
          {
              label: "Measurements",
              fillColor: "rgba(151,187,205,0.2)",
              strokeColor: "rgba(151,187,205,1)",
              pointColor: "rgba(151,187,205,1)",
              pointStrokeColor: "#fff",
              pointHighlightFill: "#fff",
              pointHighlightStroke: "rgba(151,187,205,1)",
              data: chartData
          }
      ]
  };
  chartOptions = {
    responsive: false,
    scaleBeginAtZero: true,
    scaleShowVerticalLines: false,
    scaleShowLabels: true,
    scaleFontSize: 8,
    scaleLabel: "<%=value%> Mbps",
    tooltipTemplate: "<%if (label){%><%=label%>: <%}%><%= value %> Mbps",
  };
  this.chartObject = new Chart(chartContext).Line(chartData, chartOptions);
};

InternetHealthTest.prototype.packageShareableResults = function (resultList) {
  var that = this;
  var temporaryRow,
    testResultValue,
    urlString;
  var shareableResults = {
    'time_run': Date.now(),
    'results': []
  };

  this.serverList.forEach(function (siteId) {
    if (resultList.hasOwnProperty(siteId.id) === true) {
      temporaryRow = {'siteId': siteId.id, 'siteTransit': siteId.transit};
      for (testResultValue in that.RESULTS_TO_DISPLAY) {
        if (that.RESULTS_TO_DISPLAY.hasOwnProperty(testResultValue)) {
          temporaryRow[testResultValue] = resultList[siteId.id][testResultValue];
        }
      }
      shareableResults['results'].push(temporaryRow);
    }
  });
  return shareableResults;
};

InternetHealthTest.prototype.encodeShareableResults = function (shareableResults) {
  return window.btoa(unescape(encodeURIComponent(JSON.stringify(shareableResults))));
};

InternetHealthTest.prototype.notifyTestCompletion = function (siteId, passedResults) {
  var siteIdClass = '.' + siteId;
  this.domObjects.result_list.find(siteIdClass).removeClass('ui-disabled');
  this.domObjects.result_list.listview('refresh');
  this.changeRowIcon(siteId, 'carat-r', 'complete');
  this.changeRowHighlight(siteId, false);
  this.changeRowResults(siteId, passedResults);
  this.populateHistoricalData(this.historicalData);
};

InternetHealthTest.prototype.notifyServerQueueStart = function () {
  this.domObjects.start_button.button('disable');
  this.domObjects.performance_meter.removeClass('test_control_enabled');
};

InternetHealthTest.prototype.notifyServerQueueCompletion = function (shareableInformation) {
  this.domObjects.performance_meter.addClass('test_control_enabled');
  this.domObjects.performance_meter.addClass('test_control_enabled');
  this.domObjects.start_button.val('Test Again').button('refresh');
  this.domObjects.start_button.button('enable');

  this.domObjects.share_overlay.show();
  //this.createChart(this.shareableResults, false)
  this.domObjects.performance_meter.percentageLoader({value: 'Complete'});
  this.setProgressMeterCompleted();
};

InternetHealthTest.prototype.notifyTestProgress = function (currentState,
    siteId, timeLapsed, testResult) {
  var testProgressRate;
  var testProgressRateText;
  var testPerformanceRateText;

  if (currentState === 'interval_s2c' || currentState === 'interval_c2s') {
    // Sometimes the callback can run over the alloted time, our progress
    // metric is an approximation.

    if (timeLapsed / this.NDT_TEST_LENGTH < 1) {
      testProgressRate = (timeLapsed / this.NDT_TEST_LENGTH);
    } else {
      testProgressRate = 1;
    }
    testProgressRateText = testProgressRate.toFixed(0) + '%';

    if (currentState === 'interval_s2c') {
      testPerformanceRateText = Number(testResult.s2cRate / 1000).toFixed(2) + ' Mbps';
    } else {
      testPerformanceRateText = Number(testResult.c2sRate / 1000).toFixed(2) + ' Mbps';
    }
    this.domObjects.performance_meter.percentageLoader({value: testPerformanceRateText});
    this.domObjects.performance_meter.percentageLoader({progress: testProgressRate});
  }
};

InternetHealthTest.prototype.notifyServerListUpdate = function (serverList) {
  var that = this;
  var temporaryRow;
  var i = 1;
  var onclickTransit, onclickSiteId;

  this.domObjects.server_list.text(this.mlabNsAnwer.city.replace('_', ' '));

  serverList.forEach(function (siteRecord) {
    temporaryRow = $("<li>")
      .attr('data-iconpos', 'right')
      .attr('data-icon', 'clock')
      .data('site_id', siteRecord.id)
      .addClass('ui-disabled')
      .addClass('provider')
      .addClass(siteRecord.id);
    temporaryRow.append($("<a>")
      .text("Step " + i)); //
    temporaryRow.click(function () {
      onclickSiteId = $(this).data('site_id');
      that.populatePanelData(onclickSiteId);
      that.domObjects.measurement_panel.trigger("updatelayout");
      that.domObjects.measurement_panel.panel("open")
    });
    that.domObjects.result_list.append(temporaryRow);
    i += 1;
  });
  this.domObjects.result_list.listview('refresh');
  this.domObjects.result_list.find('a.ui-icon-plus').removeClass('ui-icon-plus').addClass('ui-icon-clock')

};

InternetHealthTest.prototype.resetDashboard = function () {
  this.serverQueue = this.serverList;
  this.resultList = {};
  this.domObjects.result_list.find('.provider').remove();
  this.domObjects.advanced_results.find('li').remove();
  this.notifyServerListUpdate(this.serverQueue);
  this.domObjects.dashboard.show();
  this.domObjects.share_overlay.hide();
};


InternetHealthTest.prototype.isMobile = function () {
  return (/iPhone|Android|BlackBerry/).test(navigator.userAgent);
};

InternetHealthTest.prototype.notifyStateChange = function (newState, passedResults) {

  this.resetProgressMeter();

  if (newState === 'preparing_s2c' || newState === 'preparing_c2s') {
    this.domObjects.performance_meter.find('.percentage_text').addClass('smallertext');
    this.domObjects.performance_meter.find('div div').text('Preparing');
  } else if (newState === 'preparing_meta' || newState === 'running_meta') {
    this.domObjects.performance_meter.find('.percentage_text').addClass('smallertext');
    this.domObjects.performance_meter.find('div div').text('Submitting');
  }

  if (newState === 'finished_s2c' || newState === 'finished_c2s' ||
      newState === 'finished_all' || newState === 'finished_meta') {
    this.setProgressMeterCompleted();
  } else if (newState === 'running_s2c') {
    this.setProgressMeterReversed();
    this.domObjects.performance_meter.find('.percentage_text').addClass('biggertext');
    this.changeRowIcon(passedResults.metadata.id, 'arrow-d', 'testing');
  } else if (newState === 'running_c2s') {
    this.domObjects.performance_meter.find('.percentage_text').addClass('biggertext');
    this.changeRowIcon(passedResults.metadata.id, 'arrow-u', 'testing');
  }
};

InternetHealthTest.prototype.changeRowIcon = function (rowId, newIcon, classIcon) {
  var rowIdClass = '.' + rowId,
    dataIcon = this.domObjects.result_list.find(rowIdClass).attr('data-collapsed-icon'),
    oldIconClass = 'ui-icon-' + dataIcon,
    newIconClass = 'ui-icon-' + newIcon;
  var thisRow = this.domObjects.result_list.find(rowIdClass);

  thisRow.attr('data-collapsed-icon', newIcon)
      .find('.ui-btn')
        .removeClass('ui-icon-clock')
        .removeClass(oldIconClass)
        .addClass(newIconClass);
  if (classIcon !== undefined) {
    thisRow.removeClass('testing').removeClass('complete');
    thisRow.addClass(classIcon);
  }
  this.domObjects.result_list.listview('refresh');
};

InternetHealthTest.prototype.changeRowHighlight = function (rowId, highlighted) {
  var rowIdClass = '.' + rowId;
  if (highlighted === true) {
    this.domObjects.result_list.find(rowIdClass).addClass('ui-highlighted');
  } else {
    this.domObjects.result_list.find(rowIdClass).removeClass('ui-highlighted');
  }
};

InternetHealthTest.prototype.formatMeasurementResult = function (resultType,
    resultValue) {
  var temporaryValue;
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (resultType === 's2cRate' || resultType === 'c2sRate') {
    return Number(resultValue / 1000).toFixed(2) + ' Mbps';
  } else if (resultType === 'MinRTT') {
    return Number(resultValue).toFixed(2) + ' ms';
  } else if (resultType === 'packetRetransmissions') {
    return Number(resultValue*100).toFixed(2) + '%';
  } else if (resultType === 'timestamp') {
    temporaryValue = new Date(resultValue);
    return months[temporaryValue.getMonth()] + " " + temporaryValue.getDate() +
      " " + temporaryValue.getFullYear() + ", " + temporaryValue.getHours() + ":" +
      (temporaryValue.getMinutes() < 10 ? '0' + temporaryValue.getMinutes() : temporaryValue.getMinutes());
  }
  return undefined;
};

InternetHealthTest.prototype.changeRowResults = function (rowId, passedResults) {
  var resultsElement;
  var rowIdClass = '.' + rowId + ' a';
  var testPerformanceRateText = Number(passedResults.s2cRate / 1000).toFixed(2) + ' Mbps';

  resultsElement = $('<span>').addClass('ui-li-count').text(testPerformanceRateText);
  this.domObjects.result_list.find(rowIdClass).append(resultsElement);
};


InternetHealthTest.prototype.setProgressMeterCompleted = function () {
  this.domObjects.performance_meter.percentageLoader({progress: 1});
};

InternetHealthTest.prototype.resetProgressMeter = function () {
  this.domObjects.performance_meter.removeClass('reversed');
  this.domObjects.performance_meter.find('div div').text('');
  this.domObjects.performance_meter.find('.percentage_text')
    .removeClass('biggertext')
    .removeClass('smallertext');
};

InternetHealthTest.prototype.setProgressMeterReversed = function () {
  this.domObjects.performance_meter.addClass('reversed');
};

InternetHealthTest.prototype.shuffleArray = function (passedArray) {
  var currentIndex = passedArray.length;
  var temporaryValue,
    randomIndex;

  while (0 !== currentIndex) {

    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    temporaryValue = passedArray[currentIndex];
    passedArray[currentIndex] = passedArray[randomIndex];
    passedArray[randomIndex] = temporaryValue;
  }

  return passedArray;
};


$(document).ready(function () {
  var dashboard = new InternetHealthTest();
  dashboard.findAllServers();
});

function findMedian(data) {
    // extract the .values field and sort the resulting array
    var m = data.map(function(v) {
        return v;
    }).sort(function(a, b) {
        return a - b;
    });
    var middle = Math.floor((m.length - 1) / 2); // NB: operator precedence
    if (m.length % 2) {
        return m[middle];
    } else {
        return (m[middle] + m[middle + 1]) / 2.0;
    }
}

function standardDeviation(values){
  var avg = average(values);

  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}
