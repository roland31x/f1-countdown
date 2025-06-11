var app = angular.module('f1-countdown', []);

app.controller('CountdownController', function($scope, $interval, $http, $filter) {

    $scope.sessionNames = {
        fp1: 'Free Practice 1',
        fp2: 'Free Practice 2',
        fp3: 'Free Practice 3',
        sprint: 'Sprint',
        sprintQualifying: 'Sprint Qualifying',
        qualifying: 'Qualifying',
        gp: 'Grand Prix'
    }
    
    $scope.sessionLengths = {
        fp1: 60,
        fp2: 60,
        fp3: 60,
        sprint: 30,
        sprintQualifying: 45,
        qualifying: 60,
        gp: 120
    };

    $scope.currentDate = new Date();

    fetch('https://roland31x.github.io/f1-countdown/assets/db/2025.json')
    .then((response) => response.json())
    .then((response) => {
            $scope.races = response.races;

            

            $scope.currentDate = new Date();

            $scope.races.forEach((race) => {

            // Country code fetch

            $http
                .get(
                'https://restcountries.com/v3.1/name/' +
                    encodeURIComponent(race.country) +
                    '?fields=cca2'
                )
                .then(function (response) {
                    race.countryCode = response.data[0]?.cca2 || 'UN'; // fallback
                })
                .catch(function () {
                    race.countryCode = 'UN'; // fallback if country not found
                });
            

            

            // Convert sessions object to array with proper date objects
            race.sessions = Object.entries(race.sessions).map(([name, dateStr]) => {
                const date = new Date(dateStr);
                const projectedEnd = new Date(
                date.getTime() + 60000 * ($scope.sessionLengths[name] || 60)
                );

                return {
                name,
                date,
                completed: projectedEnd < $scope.currentDate,
                underway:
                    date <= $scope.currentDate && projectedEnd > $scope.currentDate
                };
            });

            // Sort sessions by date
            race.sessions.sort((a, b) => a.date - b.date);

            // Assign the race date for comparison
            race.date = race.sessions.find((s) => s.name === 'gp')?.date;
        });

        $scope.findNextRace();
    });

    $scope.getSessionName = function(session) {
        return $scope.sessionNames[session] || session.charAt(0).toUpperCase() + session.slice(1);
    }

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