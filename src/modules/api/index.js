import Boom from 'boom';
import {
    createUser,
    loginHandler,
    verifyCredentials,
    verifyUniqueUser,
    verifyToken
} from '../../models/user';

import Playlist from '../../models/playlist';


exports.register = function (server, options, next) {

    server.route({
        path: '/api/songs/search',
        method: 'GET',
        config: {
            auth: false,
            handler: (request, reply) => {
                const elasticsearch = server.plugins['hapi-elastic'].es;
                // TODO @ma: this needs attention

                // const client = new elasticsearch.Client({
                //     host: '127.0.0.1:9200',
                //     log: 'error'
                // });
                // console.log(client);
            }
        }
    })
    server.route({
        path: '/api/users/verify',
        method: 'GET',
        config: {
            auth: false,
            handler: verifyToken
        }
    });

    server.route({
        path: '/api/users/authenticate',
        method: 'POST',
        config: {
            auth: false,
            pre: [
                { method: verifyCredentials, assign: 'user' }
            ],
            handler: loginHandler
        }
    });

    server.route({
        path: '/api/users/create',
        method: 'POST',
        config: {
            auth: false, // change to 'jwt'
            pre: [
                { method: verifyUniqueUser }
            ],
            handler: createUser
        }
    });

    server.route({
        method: 'POST',
        path: '/api/v1/playlist/{id}',
        handler: (request, reply) => {
            const { showId, title, description, img } = request.payload;

            Playlist.create(showId, title, description, img, (err, playlist) => {
                if (err) {
                    return reply(Boom.wrap(err));
                }

                return reply({
                    success: true,
                    playlist: playlist
                });
            });
        }
    });

    next();
};

exports.register.attributes = {
    pkg: require('./package.json')
};
