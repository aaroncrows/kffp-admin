/* eslint-disable */
import MongoClient, { ObjectId } from 'mongodb';
import config from 'dotenv';
import moment from 'moment';
import shortid from 'shortid';
import * as legacyShows from './legacyShows.json';
import * as scheduleData from './winter-schedule.json';
import slugify from '../src/client/app/utils/stringParsing';

config.load(); // load environment vars

const WRITE_DB_NAME = 'kffp-admin-prod';
const READ_DB_NAME = 'legacy-playlist';
const DB_URL = 'mongodb://localhost:27017/';
const { TEMPORARY_USER_PASSWORD } = process.env;

const whitelistedAdmins = ['mark.arciaga@gmail.com', 'gilliflower@gmail.com', 'hk.clone@gmail.com', 'amy.zimmerman@gmail.com', 'fenton.felicity@gmail.com'];

const dayOfWeekMapping = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday'
};

const mapDJsToShows = (schedule) => {
    return schedule.reduce((memo, obj) => {
        if (!obj) {
            return memo;
        }
        // at first, there won't be a memo[obj.showName], so it'll end up an empty array
        // into which we push the dj name
        // but if there is a memo[obj.showName], then we just push in the next name
        memo[obj.showName] = memo[obj.showName] || [];
        memo[obj.showName].push(obj.djName);

        return memo;
    }, {});
};

const dedupeNames = (showDJMapping) => (Object.keys(showDJMapping)
    .reduce((memo, obj) => {
        if (!obj) {
            return memo;
        }

        memo[obj] = [ ...new Set(showDJMapping[obj]) ];

        return memo;
    }, {})
);

const parseJson = (obj) => (Object.keys(obj).reduce((arr, val, i) => {
   arr.push(obj[i]);

   return arr;
}, []));



const transformShows = (parsedSchedule) => {
    console.log('Transforming shows...')
    const isActive = true;

    const parsedLegacyShows = parseJson(legacyShows);
    const mappedDJsToShows = mapDJsToShows(parsedSchedule);
    const showNamesToDJNames = dedupeNames(mappedDJsToShows);
    const transformedShows = parsedLegacyShows.map((show, index) => {
        if (!show) {
            return;
        }

        const { title, djName, startDay, startHour, endHour, description } = show;

        return {
            _id: ObjectId(),
            showName: title,
            users: showNamesToDJNames[title],
            dayOfWeek: dayOfWeekMapping[Number(startDay)],
            startTime: Number(startHour),
            endTime: Number(endHour),
            isActive,
            slug: slugify(title),
            description: description
        }
    });

    return transformedShows.filter(s => s);
};

const transformUsers = (parsedSchedule) => {
    console.log('Transforming users...');

    const schedule = parsedSchedule.map(s => {
        if (!s) {
            return;
        }

        const role = whitelistedAdmins.indexOf(s.email) > -1 ? 'admin' : 'dj';
        const { email, djName, firstName, lastName } = s;

        return {
            _id: ObjectId(),
            email: email,
            password: TEMPORARY_USER_PASSWORD,
            displayName: djName,
            firstName,
            lastName,
            role
        };
    });

    return schedule.filter(s => s !== undefined);
};

const readLegacyPlaylists = async (db) => {
    try {
        const result = await db.collection('shows').find({});

        return result.toArray();
    } catch (e) {
        console.log('Failed in Read Legacy Playlists', e);
    }
};

const transformPlaylists = (legacyPlaylists, shows) => {
    console.log('Transforming Playlists...');

    let newPlaylists = [];

    legacyPlaylists.forEach((p) => {
        // p is a show
        const { playlists } = p;

        // each show has a playlists array that contains its playlist objects
        // result is an array of transformed playlist objects for a particular show
        const result = playlists.map((plist) => {
            const date = moment(plist.date, 'MMMM DD, YYYY').toISOString();
            const songs = plist.playlist.map(song => {
                if (!song) {
                    return;
                }
                const { title, artist, album, label } = song;
                const timestamp = moment
                    .utc(song.timestamp, 'ddd MMM DD YYYY HH:mm:ss')
                    .utcOffset(8)
                    .toISOString();

                return {
                    id: ObjectId(),
                    title,
                    artist,
                    album,
                    label,
                    releaseYear: '',
                    playedAt: timestamp
                };
            });

            const foundShow = shows.find(show => show.showName === p.showName);

            return {
                _id: ObjectId(),
                showId: foundShow._id,
                playlistDate: date,
                playlistId: shortid.generate(),
                songs
            };
        });

        newPlaylists.push(...result);
    });

    return newPlaylists;
};

const main = () => {
    MongoClient.connect(`${DB_URL}${READ_DB_NAME}`, async (err, db) => {
        if (err) {
            throw new Error(`Error connecting to Mongo: ${err}`);
        }

        console.log(`Connected to ${READ_DB_NAME} database`);

        try {
            const newAdminDb = await MongoClient.connect(`${DB_URL}${WRITE_DB_NAME}`);
            const collectionNames = await newAdminDb.listCollections().toArray();

            collectionNames.forEach(async (collectionName) => {
                const { name } = collectionName;

                if (!name.startsWith('system.')) {
                    const result = await newAdminDb.collection(name).drop();

                    if (result) {
                        console.log(`Dropping ${WRITE_DB_NAME}: ${name}`);
                    }
                }
            });

            const parsedSchedule = parseJson(scheduleData);
            const shows = transformShows(parsedSchedule);
            const users = transformUsers(parsedSchedule);
            const legacyPlaylists = await readLegacyPlaylists(db);
            const transformedPlaylists = transformPlaylists(legacyPlaylists, shows);

            const userResult = await newAdminDb.collection('users').insertMany(users);
            const showResult = await newAdminDb.collection('shows').insertMany(shows);
            const playlistResult = await newAdminDb.collection('playlists').insertMany(transformedPlaylists);

            // Lastly, we need to update the shows.users display name strings with the corresponding userIds

            if (userResult.result.ok && showResult.result.ok && playlistResult.result.ok) {
                console.log('Import success!');

                process.exit();
            }

            console.log('Something went wrong with the import');

            process.exit(1);
        } catch (e) {
            console.log(e);
        }
    });
};

main();
/* eslint-enable */
