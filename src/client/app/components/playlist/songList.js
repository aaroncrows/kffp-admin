import React, { Component } from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import RaisedButton from 'material-ui/RaisedButton';
import update from 'immutability-helper';
import cuid from 'cuid';
import SongFormWrapper from './songFormWrapper';
import { reorderSongsSave, addTrack } from '../../actions/playlistActions';
import { generateBlankSongData } from '../../utils/helperFunctions';

const style = {
    width: 400
};

class SongList extends Component {
    constructor (props) {
        super(props);
        const { currentPlaylist } = props;
        const { songs } = currentPlaylist;

        this.moveSong = this.moveSong.bind(this);
        this.onSaveOrder = this.onSaveOrder.bind(this);
        this.addNewSong = this.addNewSong.bind(this);

        this.state = {
            songs
        };
    }

    onSaveOrder () {
        const { songs, _id } = this.props.currentPlaylist;

        this.props.dispatch(reorderSongsSave(songs, _id));
    }

    moveSong (dragIndex, hoverIndex) {
        const { songs } = this.state;
        const dragSong = songs[dragIndex];

        this.setState(update(this.state, {
            songs: {
                $splice: [
                    [dragIndex, 1],
                    [hoverIndex, 0, dragSong]
                ]
            }
        }));
    }

    addNewSong () {
        const { _id } = this.props.currentPlaylist;
        const blankSong = generateBlankSongData();

        this.setState(update(this.state, {
            songs: { $unshift: [ blankSong ]}
        }));

        this.props.dispatch(addTrack(blankSong, _id));
    }

    render () {
        const { songs } = this.state;
        const { _id } = this.props.currentPlaylist;

        return (
            <div style={style}>
                <RaisedButton
                    type="button"
                    onClick={this.onSaveOrder}
                    label="Save Track Order"
                    backgroundColor="#3F51B5"
                    labelColor="#FFFFFF"
                />

                <RaisedButton
                    type="button"
                    label="Add New Track"
                    onClick={this.addNewSong}
                    backgroundColor="#8BC34A"
                    labelColor="#FFFFFF"
                />

                {songs.map((song, i) => (
                    // song: album, artist, track, releaseDate, id, images
                    <SongFormWrapper
                        index={i}
                        key={song.id || cuid()}
                        moveSong={this.moveSong}
                        playlistId={_id}
                        {...song}
                    />
                ))}
            </div>
        );
    }
}
export default DragDropContext(HTML5Backend)(SongList);
