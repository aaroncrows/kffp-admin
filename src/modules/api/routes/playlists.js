import {
    getPlaylistsByShow,
    createPlaylist,
    addTrack,
    updateTracks,
    updateTrackOrder,
    deleteTrackFromPlaylist
} from '../../../models/playlist';

const playlistRoutes = [
    {
        path: '/api/playlists/{slug}',
        method: 'GET',
        config: {
            validate: {
                //
            },
            auth: {
                strategy: 'jwt',
                scope: ['admin', 'dj']
            },
            handler: getPlaylistsByShow
        }
    },
    {
        path: '/api/playlists',
        method: 'POST',
        config: {
            auth: {
                strategy: 'jwt',
                scope: ['admin', 'dj']
            },
            handler: createPlaylist
        }
    },
    {
        path: '/api/playlists/{playlistId}',
        method: 'PUT',
        config: {
            auth: {
                strategy: 'jwt',
                scope: ['admin', 'dj']
            },
            handler: addTrack
        }
    },
    {
        path: '/api/playlists/{playlistId}',
        method: 'PATCH',
        config: {
            auth: {
                strategy: 'jwt',
                scope: ['admin', 'dj']
            },
            handler: updateTracks
        }
    },
    {
        path: '/api/playlists/{playlistId}/tracks',
        method: 'PUT',
        config: {
            auth: {
                strategy: 'jwt',
                scope: ['admin', 'dj']
            },
            handler: updateTrackOrder
        }
    },
    {
        path: '/api/playlists/{playlistId}/tracks/{trackId}',
        method: 'DELETE',
        config: {
            auth: {
                strategy: 'jwt',
                scope: ['admin', 'dj']
            },
            handler: deleteTrackFromPlaylist
        }
    }
];

export default playlistRoutes;
