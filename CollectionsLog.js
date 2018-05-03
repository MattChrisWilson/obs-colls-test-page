import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'
import WarehouseSelector from '../../containers/warehouseSelector'
import Schedule from '../Schedule'
import Modal from '../../containers/modal'
import { Sidebar, Segment, Menu, Button, Icon } from 'semantic-ui-react'
import _ from 'lodash'
import { amendDate, sortCollections, createCollectionLogObj } from '../../resources'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { distinctUntilChanged, tap, combineLatest } from 'rxjs/operators'

/** Creates an instance of the collections log */
class CollectionsLog extends Component {
    state = {
      data: {},
      editable: false,
    }

    curBays$ = new BehaviorSubject(this.props.bays)
    curCollections$ = new BehaviorSubject(this.props.collections)
    stuff$
    bays$
    collections$

    componentDidMount() {
      this.bays$ = this.curBays$.pipe(distinctUntilChanged())

      this.collections$ = this.curCollections$.pipe(
        distinctUntilChanged(),
        sortCollections()
      )

      this.stuff$ = this.bays$.pipe(
        combineLatest(this.collections$),
        createCollectionLogObj(),
        tap(data => this.setState({ data })),
      ).subscribe()

      this.props.warehouseEpic()
      
      if(!this.props.isLoggedIn) 
        this.props.history.push('/')
    }

    componentWillUnmount() {
      this.stuff$.unsubscribe()
    }

    componentDidUpdate = (prevProps) => {
      this.curBays$.next(this.props.bays)
      this.curCollections$.next(this.props.collections)

      if(!_.isNil(this.props.selectedWarehouse.key) && prevProps.isBayFetching && !this.props.isBayFetching) {
        let data = Object.keys(this.props.bays).reduce((obj, bay) => {return { ...obj, [bay]: {} }}, {})
        this.setState({ data: {bays: data }})
      }

      if(prevProps.curDate !== this.props.curDate) {
        this.editable(this.props.curDate).then(editable => this.setState({ editable }))
      }
    }

    openSearch = () => {
      this.props.setModalOpen()
      this.props.history.push('/collections/search')
    }

    selectWarehouse = (e, { value }) => {
      if( value === undefined ) return false
      return ( value.key === this.props.selectedWarehouse.key ) ? this.props.resetWarehouse() : this.props.setWarehouse({warehouse: value})
    }

    editable(schedulerDate) {
      return new Promise((res, rej) => {
        schedulerDate = new Date(schedulerDate)
        let now = new Date()

        if(schedulerDate <= now) return res(false)
        if(schedulerDate > amendDate(new Date())) return res(true)

        const cutOff = new Date()
        cutOff.setMilliseconds(0)
        cutOff.setSeconds(0)
        cutOff.setMinutes(0)
        cutOff.setHours((isNaN(this.props.cutOff*1)) ? 0 : this.props.cutOff)

        return (now > cutOff) ? res(false) : res(true)
      })
    }

    handleClick = (client) => {
      const { link: { type, reference = '' }} = client

      this.props.history.push(`/collections/${type}/${reference}`)

      this.props.setModalOpen({
        ...client, 
        userId: this.props.userId, 
        warehouseKey: this.props.selectedWarehouse.key, 
        warehouseId: this.props.selectedWarehouse.id, 
        _id: this.props.userId+'-'+this.props.session, 
        dueDate: this.props.curDate,
      })
    }

    render() {
        return (
            <Fragment>
              <Sidebar.Pushable as={Segment}>
                <Sidebar as={Menu} animation='push' width='thin' visible={this.props.menuOpen} icon='labeled' vertical inverted color="blue" >
                  <Menu.Item key={"menu-search"} value="0" onClick={this.openSearch}><Icon name="search" size="tiny" />Search</Menu.Item>
                  <WarehouseSelector onClick={this.selectWarehouse} />
                  <Button fluid attached="bottom" onClick={this.props.resetSession} >Sign Out</Button>
                </Sidebar>
                <Sidebar.Pusher>
                  <Segment basic className="pusher-max-height">
                    <Button onClick={this.props.toggleMenu} icon="bars" content="Toggle Menu" /><br/><br/>
                    {(!_.isNil(this.props.selectedWarehouse.key) && !this.props.isBayFetching) ? 
                      <Schedule 
                        range={{start: 6, end: 18}} 
                        data={this.state.data}  
                        editable={this.state.editable}
                        onClick={(obj => {this.handleClick(obj)})}
                      /> : <div/>}
                    <Modal />
                  </Segment>
                </Sidebar.Pusher>
              </Sidebar.Pushable>
            </Fragment>
        )
    }
}

CollectionsLog.propTypes = {
    /** Is the user logged in? */
    isLoggedIn: PropTypes.bool.isRequired,
}

CollectionsLog.defaultProps = {
    isLoggedIn: false,
}

export default CollectionsLog