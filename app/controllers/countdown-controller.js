var app = angular.module('f1-countdown', []);

app.controller('CountdownController', function($scope, $interval, $http, $filter) {

    $scope.sessionNames = ['FirstPractice', 'SecondPractice', 'ThirdPractice', 'Sprint', 'Qualifying'];
    $scope.sessionLengths = {
        'FP1': 60,
        'FP2': 60,
        'FP3': 60,
        'Sprint': 30,
        'Sprint Qualifying': 45,
        'Qualifying': 60,
        'Race': 120
    }
    $scope.currentDate = new Date();

    $http.get('https://ergast.com/api/f1/2024.json').then(function(response) {
        $scope.races = response.data.MRData.RaceTable.Races;

        //console.log($scope.races);

        $scope.races.forEach(race => {

            if(race.Circuit.Location.country == "UK") {
                race.countryCode = "GB";
            }
            else if(race.Circuit.Location.country == "China") {
                race.countryCode = "CN";
            }
            else if(race.Circuit.Location.country == "United States") {
                race.countryCode = "US";
            }
            else{
                $http.get('https://restcountries.com/v3.1/name/' + race.Circuit.Location.country +"?fields=cca2").then(function(response) {
                    //console.log(response);
                    race.countryCode = response.data[0].cca2;
                });
            }          

            let ymd = race.date;
            let hms = race.time;
            race.date = $scope.getUtcDate(ymd, hms);

            let sessions = [];

            if(race.FirstPractice){
                let sesh = {
                    name: "FP1",
                    date: $scope.getUtcDate(race.FirstPractice.date, race.FirstPractice.time)
                }
                sessions.push(sesh);
            }

            if(race.SecondPractice){
                let sesh = {
                    name: race.Sprint ? "Sprint Qualifying" : "FP2", 
                    date: $scope.getUtcDate(race.SecondPractice.date, race.SecondPractice.time)
                }
                sessions.push(sesh);            
            }

            if(race.ThirdPractice){
                let sesh = {
                    name: "FP3", 
                    date: $scope.getUtcDate(race.ThirdPractice.date, race.ThirdPractice.time)
                }
                sessions.push(sesh);
            }

            if(race.Sprint){
                let sesh = {
                    name: "Sprint", 
                    date: $scope.getUtcDate(race.Sprint.date, race.Sprint.time)
                }
                sessions.push(sesh);
            }

            if(race.Qualifying){
                let sesh = {
                    name: "Qualifying", 
                    date: $scope.getUtcDate(race.Qualifying.date, race.Qualifying.time)
                }
                sessions.push(sesh);
            }


            sessions.push({name: "Race", date: race.date});


            sessions.forEach(session => {
                let projectedEnd = new Date(session.date.getTime() + 60000 * $scope.sessionLengths[session.name]);
                // console.log(session.name + ": " + session.date + " - " + projectedEnd);
                if(projectedEnd < $scope.currentDate) {
                    session.completed = true;
                }
                if(session.date < $scope.currentDate && projectedEnd > $scope.currentDate) {
                    session.underway = true;
                } 
            });

            race.sessions = sessions;
            
        })
        $scope.findNextRace();
    });

    $scope.getUtcDate = function(date, time) {
        let year = date.split('-')[0];
        let month = date.split('-')[1];
        let day = date.split('-')[2];

        let hr = time.split(':')[0];
        let min = time.split(':')[1];
        let sec = 0;

        return new Date(Date.UTC(year, month - 1, day, hr, min, sec));
    }

    $scope.findNextRace = function() {
        $scope.nextRace = null;
        $scope.races.forEach(race => {
            if($scope.nextRace) {
                return;
            }
            if(Date.parse(race.date) > $scope.currentDate) {
                $scope.nextRace = race;
                $scope.findNextSession();
            }
        });
        
        //$scope.nextRace = $scope.races[0];
    };

    $scope.findNextSession = function() {
        $scope.nextSession = null;
        $scope.nextRace.sessions.forEach(session => {
            if($scope.nextSession) {
                return;
            }
            if(session.underway){
                $scope.nextSession = session;
                return;
            }
            if(session.date > $scope.currentDate) {
                $scope.nextSession = session;
                //console.log("Next session: " + $scope.nextSession.name);
            }
        });

        if(!$scope.nextSession) {
            $scope.findNextRace();
            return;
        }

        $scope.updateTimeRemaining();

    }

    $scope.updateTimeRemaining = function() {

        if($scope.nextSession.date < $scope.currentDate) {
            let projectedEnd = new Date($scope.nextSession.date.getTime() + 60000 * $scope.sessionLengths[$scope.nextSession.name]);
            if(projectedEnd > $scope.currentDate) {
                $scope.nextSession.underway = true;
            }
            else{
                $scope.nextSession.completed = true;
                $scope.nextSession.underway = null;
                //console.log("Session completed: " + $scope.nextSession.name);
                $scope.findNextSession();
            }            
            return;
        }

        $scope.daysleft = Math.floor((Date.parse($scope.nextSession.date) - Date.parse($scope.currentDate)) / 86400000);
        $scope.hoursleft = Math.floor((Date.parse($scope.nextSession.date) - Date.parse($scope.currentDate)) / 3600000) % 24;
        $scope.minutesleft = Math.floor((Date.parse($scope.nextSession.date) - Date.parse($scope.currentDate)) / 60000) % 60;
        $scope.secondsleft = Math.floor((Date.parse($scope.nextSession.date) - Date.parse($scope.currentDate)) / 1000) % 60;

        $scope.timeLeft = "";
        if($scope.daysleft > 0) {
            $scope.timeLeft = $scope.daysleft + " Day" + ($scope.daysleft == 1 ? " " : "s ");
        }
        if($scope.hoursleft > 0 || $scope.daysleft > 0) {
            $scope.timeLeft += $scope.hoursleft + " Hour" + ($scope.hoursleft == 1 ? " " : "s ");
        }
        if($scope.minutesleft > 0 || $scope.hoursleft > 0 || $scope.daysleft > 0) {
            $scope.timeLeft += $scope.minutesleft + " Minute" + ($scope.minutesleft == 1 ? " " : "s ");
        }
        if($scope.secondsleft > 0 || $scope.minutesleft > 0 || $scope.hoursleft > 0 || $scope.daysleft > 0) {
            $scope.timeLeft += $scope.secondsleft + " Second" + ($scope.secondsleft == 1 ? " " : "s ");
        }
    }

    
    $interval(function() {
        if($scope.nextRace){
            $scope.currentDate = new Date();
            $scope.updateTimeRemaining(); 
        }          
    }, 1000);

});


app.filter('localestr', function() {
    return function(date) {
      // Check if date is valid
      if (!date) return '';
      
      // Convert date to a Date object if it’s not already one
      const dateObj = (date instanceof Date) ? date : new Date(date);

      // Format date to localized string
      return dateObj.toLocaleString('default', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
      });
    };
  });