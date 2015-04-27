/*jslint bitwise: true, browser: true, nomen: true, vars: true, indent: 2 */
/*global Uint8Array, NDTjs, $, Spinner */

'use strict';

function InternetHealthTest() {
  this.serverQueue = [];
  this.serverList = [];
  this.resultList = [];
  this.isRunning = false;
  this.canvas = $('.canvas');
  this.lastStateChange = undefined;
  this.mlabNsAnwer = undefined;
  this.historicalData = [];

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
    'MinRTT': 'Latency'
  };
  this.domObjects = {
    'intro_overlay': this.canvas.find('.intro_overlay'),
    'performance_meter': this.canvas.find('.performance_meter'),
    'performance_meter_objects': this.canvas.find('.performance_meter div'),
    'result_list': this.canvas.find('.dashboard__result_list .ui-collapsible-set'),
    'start_button': this.canvas.find('.dashboard__start_button'),
    'server_list': this.canvas.find('.select__server_location'),
    'historical_information': this.canvas.find('.historical_information')
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
  this.setupInterface();
}

InternetHealthTest.prototype.setupInterface = function () {
  var that = this;
  this.domObjects.intro_overlay.popup();
  this.domObjects.start_button.button();
  
  this.domObjects.start_button.button('enable');
  this.domObjects.start_button.focus();
  this.domObjects.performance_meter.percentageLoader({value: 'Upload'});
  this.domObjects.performance_meter.find('div div').text('Start');
  this.domObjects.performance_meter.addClass('test_control_enabled');
  this.domObjects.intro_overlay.popup('open');

  this.domObjects.start_button.click(function () {
    that.domObjects.intro_overlay.popup('close');
    if (that.resultList.length > 0) {
      that.resetDashboard();
    }
    that.runServerQueue();
  });
  this.domObjects.performance_meter.click(function () {
    if (that.domObjects.performance_meter.hasClass('test_control_enabled') === true) {
      if (that.resultList.length > 0) {
        that.resetDashboard();
      }
      that.runServerQueue();
    }
  });
  
  $.merge(this.historicalData, this.getlocalStorage());
  this.populateHistoricalData(this.historicalData);
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

InternetHealthTest.prototype.populateResultData = function (siteId, passedResults) {
  var siteIdClass = '.' + siteId;
  var thisListView = this.domObjects.result_list.find(siteIdClass).find('ul');
  var testResultItem, testResultValueString;

  this.domObjects.result_list.find(siteIdClass).removeClass('ui-disabled');
  for (var testResultValue in this.RESULTS_TO_DISPLAY) {
    if (this.RESULTS_TO_DISPLAY.hasOwnProperty(testResultValue)) {
      testResultValueString = this.formatMeasurementResult(testResultValue,
        passedResults[testResultValue]);
      testResultItem = $('<li>').text(this.RESULTS_TO_DISPLAY[testResultValue]);
      testResultItem.append($('<span>')
        .addClass('ui-li-count')
        .text(testResultValueString));
      thisListView.append(testResultItem);
    }
  }
  thisListView.listview().listview('refresh');
  this.domObjects.result_list.collapsibleset('refresh');
};

InternetHealthTest.prototype.findServers = function () {
  var mlabNsRequest = new XMLHttpRequest(),
    mlabNsUrl = 'http://mlab-ns.appspot.com/ndt?format=json',
    that = this;

  mlabNsRequest.onreadystatechange = function () {
    if (mlabNsRequest.readyState === 4) {
      if (mlabNsRequest.status === 200) {
        that.mlabNsAnwer = JSON.parse(mlabNsRequest.responseText);
        that.mlabNsAnwer.metro = that.mlabNsAnwer.site.slice(0, 3);
        that.findMoreServers(that.mlabNsAnwer);
      }
    }
  };
  mlabNsRequest.open("GET", mlabNsUrl, true);
  mlabNsRequest.send();
};

InternetHealthTest.prototype.findMoreServers = function (mlabNsAnwer) {
  var mlabSiteListRequest = new XMLHttpRequest();
  var mlabSiteListURL = "resources/datasets/site_list.json";
  var that = this;
  var constructedRecord;

  mlabSiteListRequest.open("GET", mlabSiteListURL, true);
  mlabSiteListRequest.onload = function () {
    if (mlabSiteListRequest.status === 200) {
      that.serverList = that.parseServerList(mlabSiteListRequest.responseText, mlabNsAnwer.metro);

      if (that.serverList.length === 0) {
        constructedRecord = that.constructSiteRecord(mlabNsAnwer);
        that.serverList.push(constructedRecord);
      }
      that.notifyServerListUpdate(that.serverList);
    }
  };
  mlabSiteListRequest.send();
};

InternetHealthTest.prototype.parseServerList = function (responseText, metro) {
  var siteMap = JSON.parse(responseText);
  var that = this;

  if (siteMap[metro] !== undefined) {
    siteMap[metro].forEach(function (siteRecord) {
      that.serverList.push(that.parseSiteRecord(siteRecord));
    });
  }
  return this.serverList;
};

InternetHealthTest.prototype.parseSiteRecord = function (siteRecord) {
  return {
    address: 'ndt.iupui.mlab1.nuq0t.measurement-lab.org',
    port: Number('3001'),
    transit: siteRecord.transit,
    path: '/ndt_protocol',
    site: siteRecord.site,
    id: (siteRecord.site + '_' + siteRecord.transit).replace(' ', '_')
  };
};
InternetHealthTest.prototype.constructSiteRecord = function (mlabNsAnwer) {
  return {
    address: 'ndt.iupui.mlab1.nuq0t.measurement-lab.org',
    port: Number('3001'),
    transit: mlabNsAnwer.city,
    path: '/ndt_protocol',
    site: mlabNsAnwer.site,
    id: (mlabNsAnwer.site + '_' + mlabNsAnwer.transit).replace(' ', '_')
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
  this.isRunning = true;
  this.ndtClient = new NDTjs(currentServer.address,
    currentServer.port, currentServer.path, this, 100);
  this.ndtClient.results.metadata = currentServer;
  this.ndtClient.results.siteId = currentServer.id;
  this.notifyTestStart(currentServer);
  this.ndtClient.startTest();
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
  var currentServer;

  this.resultList.push(passedResults);
  this.historicalData.push(passedResults);
  this.setlocalStorage(this.historicalData);
  this.notifyTestCompletion(passedResults.siteId, passedResults);

  if (this.serverQueue.length > 0) {
    currentServer = this.serverQueue.shift();
    this.runTest(currentServer);
  } else {
    this.notifyServerQueueCompletion();
    this.isRunning = false;
  }
};

InternetHealthTest.prototype.onerror = function () { return false; };

InternetHealthTest.prototype.notifyTestStart = function (currentServer) {
  this.changeRowIcon(currentServer.id, 'recycle');
  this.changeRowHighlight(currentServer.id, true);
};

InternetHealthTest.prototype.notifyTestCompletion = function (siteId, passedResults) {
  this.changeRowIcon(siteId, 'plus');
  this.changeRowHighlight(siteId, false);
  this.changeRowResults(siteId, passedResults);
  this.populateResultData(siteId, passedResults);
  this.populateHistoricalData(this.historicalData);
};

InternetHealthTest.prototype.notifyServerQueueStart = function () {
  this.domObjects.start_button.button('disable');
  this.domObjects.performance_meter.removeClass('test_control_enabled');
};

InternetHealthTest.prototype.notifyServerQueueCompletion = function () {
  this.domObjects.performance_meter.addClass('test_control_enabled');
  this.domObjects.performance_meter.percentageLoader({value: 'Complete'});
  this.domObjects.performance_meter.addClass('test_control_enabled');
  this.domObjects.start_button.val('Test Again').button('refresh');
  this.domObjects.start_button.button('enable');
  this.notifyResultListUpdate();
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

  this.domObjects.server_list.text(this.mlabNsAnwer.city.replace('_', ' '));

  serverList.forEach(function (siteRecord) {
    temporaryRow = $("<div>")
      .attr('data-collapsed-icon', 'plus')
      .attr('data-expanded-icon', 'minus')
      .attr('data-iconpos', 'right')
      .attr('data-role', 'collapsible')
      .addClass('provider')
      .addClass('ui-disabled')
      .addClass('ui-icon-clock')
      .addClass(siteRecord.id);
    temporaryRow.append($("<h3>").text(siteRecord.transit));
    temporaryRow.append($("<ul>")
      .attr('data-role-icon', 'listview')
      .attr('data-theme', 'a'));
    that.domObjects.result_list.append(temporaryRow);
  });
  this.domObjects.result_list.collapsibleset('refresh');
  this.domObjects.result_list.find('a.ui-icon-plus').removeClass('ui-icon-plus').addClass('ui-icon-clock')

};

InternetHealthTest.prototype.resetDashboard = function () {
  this.serverQueue = this.serverList;
  this.resultList = [];
  this.domObjects.result_list.find('.provider').remove();
  this.notifyServerListUpdate(this.serverQueue);
};


InternetHealthTest.prototype.notifyResultListUpdate = function () {
  return;
};

InternetHealthTest.prototype.notifyStateChange = function (newState, passedResults) {

  this.resetProgressMeter();
  
  if (newState === 'preparing_s2c' || newState === 'preparing_c2s') {
    this.domObjects.performance_meter.find('div div').first().css('font', '40px BebasNeueRegular')
    this.domObjects.performance_meter.find('div div').text('Preparing');
  } else if (newState === 'preparing_meta' || newState === 'running_meta') {
    this.domObjects.performance_meter.find('div div').first().css('font', '40px BebasNeueRegular')
    this.domObjects.performance_meter.find('div div').text('Submitting');
  }

  if (newState === 'finished_s2c' || newState === 'finished_c2s' ||
      newState === 'finished_all' || newState === 'finished_meta') {
    this.setProgressMeterCompleted();
  } else if (newState === 'running_s2c') {
    this.setProgressMeterReversed();
    this.changeRowIcon(passedResults.metadata.id, 'arrow-d');
  } else if (newState === 'running_c2s') {
    this.changeRowIcon(passedResults.metadata.id, 'arrow-u');
  }
};

InternetHealthTest.prototype.changeRowIcon = function (rowId, newIcon) {
  var rowIdClass = '.' + rowId,
    dataIcon = this.domObjects.result_list.find(rowIdClass).attr('data-collapsed-icon'),
    oldIconClass = 'ui-icon-' + dataIcon,
    newIconClass = 'ui-icon-' + newIcon;
  this.domObjects.result_list.find(rowIdClass)
      .attr('data-collapsed-icon', newIcon)
      .find('.ui-btn')
        .removeClass('ui-icon-clock')
        .removeClass(oldIconClass)
        .addClass(newIconClass);
  this.domObjects.result_list.collapsibleset('refresh');
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
  if (resultType === 's2cRate' || resultType === 'c2sRate') {
    return Number(resultValue / 1000).toFixed(2) + ' Mbps';
  } else if (resultType === 'MinRTT') {
    return Number(resultValue).toFixed(2) + ' ms';
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
  this.domObjects.performance_meter.find('div div').first().css('font', '64px BebasNeueRegular')
};

InternetHealthTest.prototype.setProgressMeterReversed = function () {
  this.domObjects.performance_meter.addClass('reversed');
};


$(document).ready(function () {
  var dashboard = new InternetHealthTest();
  dashboard.findServers();
});
