import React from 'react';
import _ from 'lodash';
import { withRouter } from 'react-router';

import { DialogsMixin } from '../../mixins';

import HostingFilesStore from './HostingFilesStore';
import HostingFilesActions from './HostingFilesActions';

import { ColumnList, Lists, Dialog, Loading } from '../../common';
import HostingFilesEmptyView from './HostingFilesEmptyView';
import ListItem from './HostingFilesListItem';
import DotsListItem from './DotsListItem';

const Column = ColumnList.Column;

const HostingFilesList = React.createClass({
  mixins: [
    DialogsMixin
  ],

  getDefaultProps() {
    return {
      getCheckedItems: HostingFilesStore.getCheckedItems,
      checkItem: HostingFilesActions.checkItem,
      checkFolder: this.handleCheckFolder,
      handleSelectAll: HostingFilesActions.selectAll,
      handleUnselectAll: HostingFilesActions.uncheckAll
    };
  },

  getFolderFiles(file) {
    const { items, directoryDepth } = this.props;
    const fileFolderName = file.path.split('/')[directoryDepth];
    const folderFiles = _.filter(items, (item) => {
      const itemFolders = item.path.split('/');
      const hasSubFolders = directoryDepth > itemFolders.length;
      const isFileInCurrentFolder = _.includes(itemFolders, fileFolderName);

      return !hasSubFolders && isFileInCurrentFolder;
    });

    return folderFiles;
  },

  isSupportedBrowser() {
    return !!window.chrome && !!window.chrome.webstore;
  },

  handleCheckFolder(folder) {
    const { directoryDepth, currentFolderName } = this.props;

    HostingFilesActions.checkFolder(folder, directoryDepth, currentFolderName);
  },

  handleUploadFiles(event) {
    const { currentFolderName, handleUploadFiles } = this.props;

    return handleUploadFiles(currentFolderName, event);
  },

  initDialogs() {
    const { isLoading, getCheckedItems } = this.props;
    const { hostingId } = this.props.params;

    return [{
      dialog: Dialog.Delete,
      params: {
        key: 'removeHostingFilesDialog',
        ref: 'removeHostingFilesDialog',
        contentSize: 'medium',
        title: 'Delete Hosting Files',
        handleConfirmParam: hostingId,
        handleConfirm: HostingFilesActions.removeHostingFiles,
        itemLabelName: 'path',
        groupName: 'Hosting Files',
        items: getCheckedItems(),
        isLoading
      }
    }];
  },

  filterByCurrentDirectoryDepth(items) {
    const { directoryDepth, currentFolderName } = this.props;
    const filteredItems = _.filter(items, (item) => {
      const isInFolder = directoryDepth < item.folders.length;
      const isInRootFolder = currentFolderName === '';
      const isInSubfolder = _.includes(item.folders, currentFolderName);

      return isInFolder && isInSubfolder || isInRootFolder;
    });

    return filteredItems;
  },

  filterFolders(items) {
    const { directoryDepth } = this.props;
    let extendedItems = _.map(items, (item) => {
      const itemFolders = item.path.split('/');

      item.isFolder = _.isString(itemFolders[directoryDepth + 1]);
      item.folderName = itemFolders[directoryDepth];
      item.folders = itemFolders;
      item.files = item.isFolder ? this.getFolderFiles(item) : [];

      return item;
    });

    extendedItems = this.filterByCurrentDirectoryDepth(extendedItems);

    const splitedByType = _.partition(extendedItems, (item) => item.isFolder);
    const uniqueFolders = _.uniqBy(splitedByType[0], (item) => item.folderName);

    return [...uniqueFolders, ...splitedByType[1]];
  },

  showRemoveDialog() {
    this.showDialog('removeHostingFilesDialog');
  },

  renderHeader() {
    const { handleTitleClick, handleSelectAll, handleUnselectAll, items, getCheckedItems } = this.props;

    return (
      <ColumnList.Header>
        <Column.ColumnHeader
          className="col-sm-14"
          primary={true}
          columnName="CHECK_ICON"
          handleClick={handleTitleClick}
          data-e2e="hosting-files-list-title"
        >
          File
        </Column.ColumnHeader>
        <Column.ColumnHeader
          columnName="DESC"
          className="col-flex-1"
        >
          Path
        </Column.ColumnHeader>
        <Column.ColumnHeader
          columnName="DESC"
          className="col-sm-4"
        >
          Size
        </Column.ColumnHeader>
        <Column.ColumnHeader columnName="MENU">
          <Lists.Menu
            checkedItemsCount={getCheckedItems().length}
            handleSelectAll={handleSelectAll}
            handleUnselectAll={handleUnselectAll}
            itemsCount={items.length}
          >
            <Lists.MenuItem onTouchTap={this.showRemoveDialog} />
          </Lists.Menu>
        </Column.ColumnHeader>
      </ColumnList.Header>
    );
  },

  renderDotsListItem() {
    const { moveDirectoryUp } = this.props;

    return (
      <DotsListItem onClickDots={moveDirectoryUp} />
    );
  },

  renderItems() {
    const { checkItem, directoryDepth, items, moveDirectoryDown } = this.props;
    const filteredItems = this.filterFolders(items);
    const listItems = _.map(filteredItems, (item) => {
      const filesToRemove = item.isFolder ? item.files : item;

      return (
        <ListItem
          key={`hosting-file-list-item-${item.id}`}
          onFolderEnter={moveDirectoryDown}
          onIconClick={item.isFolder ? () => this.handleCheckFolder(item) : checkItem}
          directoryDepth={directoryDepth}
          item={item}
          showDeleteDialog={() => this.showDialog('removeHostingFilesDialog', filesToRemove)}
        />
      );
    });

    if (directoryDepth) {
      const dotsListItem = this.renderDotsListItem();

      listItems.unshift(dotsListItem);
    }

    return listItems;
  },

  renderEmptyView() {
    return (
      <HostingFilesEmptyView
        {...this.props}
        handleUploadFiles={this.handleUploadFiles}
      />
    );
  },

  render() {
    const { items, isLoading, hasFiles, isDeleting, isUploading, ...other } = this.props;

    if (!items.length || hasFiles || isUploading || isDeleting) {
      return (
        <Loading show={isLoading}>
          {this.renderEmptyView()}
        </Loading>
      );
    }

    return (
      <div>
        {this.getDialogs()}
        {this.renderHeader()}
        <Lists.List
          {...other}
          isLoading={isLoading}
          key="hosting-files-list"
        >
          {this.renderItems()}
          {this.renderEmptyView()}
        </Lists.List>
      </div>
    );
  }
});

export default withRouter(HostingFilesList);
