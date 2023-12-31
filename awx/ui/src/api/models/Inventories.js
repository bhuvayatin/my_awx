import Base from '../Base';
import InstanceGroupsMixin from '../mixins/InstanceGroups.mixin';

class Inventories extends InstanceGroupsMixin(Base) {
  constructor(http) {
    super(http);
    this.baseUrl = 'api/v2/inventories/';

    this.readAccessList = this.readAccessList.bind(this);
    this.readHostVersion = this.readHostVersion.bind(this);
    this.readPanoramaVersion = this.readPanoramaVersion.bind(this);
    this.readfirewallsVersion = this.readfirewallsVersion.bind(this);
    this.readAccessOptions = this.readAccessOptions.bind(this);
    this.readHosts = this.readHosts.bind(this);
    this.readHostDetail = this.readHostDetail.bind(this);
    this.readGroups = this.readGroups.bind(this);
    this.readGroupsOptions = this.readGroupsOptions.bind(this);
    this.promoteGroup = this.promoteGroup.bind(this);
    this.readInputInventories = this.readInputInventories.bind(this);
    this.associateInventory = this.associateInventory.bind(this);
    this.disassociateInventory = this.disassociateInventory.bind(this);
    this.get_interface_details = this.get_interface_details.bind(this);
    this.high_availability = this.high_availability.bind(this);
    this.general_information = this.general_information.bind(this);
    this.session_information = this.session_information.bind(this);
    this.get_log = this.get_log.bind(this);
    this.get_xml = this.get_xml.bind(this);
    this.stop_proccess = this.stop_proccess.bind(this);
    this.generate_api_key = this.generate_api_key.bind(this);
    this.firewalls_details = this.firewalls_details.bind(this);
    this.firewall_backup_tgz_file = this.firewall_backup_tgz_file.bind(this);
  }

  readHostVersion(data) {
    return this.http.post(`${this.baseUrl}get/version/`, data);
  }

  readPanoramaVersion(data) {
    return this.http.post(`${this.baseUrl}get/panorama/`, data);
  }

  readfirewallsVersion(data) {
    return this.http.post(`${this.baseUrl}get/firewalls/`, data);
  }

  readAccessList(id, params) {
    return this.http.get(`${this.baseUrl}${id}/access_list/`, {
      params,
    });
  }
  get_interface_details(data) {
    return this.http.post(`${this.baseUrl}get/interface_details/`, data);
  }
  general_information(data) {
    return this.http.post(`${this.baseUrl}get/general_information/`, data);
  }
  get_log(data) {
    return this.http.post(`${this.baseUrl}get/firewall_status_logs/`, data);
  }
  get_xml(data) {
    return this.http.post(`${this.baseUrl}get/firewall_backup_file/`, data);
  }
  firewalls_details(data) {
    return this.http.post(`${this.baseUrl}get/firewalls_details/`, data);
  }
  firewall_backup_tgz_file(data){
    return this.http.post(`${this.baseUrl}get/firewall_backup_tgz_file/`, data);
  }
  stop_proccess(data) {
    return this.http.post(`${this.baseUrl}get/firewall_process_stop/`, data);
  }
  generate_api_key(data) {
    return this.http.post(`${this.baseUrl}get/generate_api_key/`, data);
  }
  session_information(data) {
    return this.http.post(`${this.baseUrl}get/session_information/`, data);
  }
  high_availability(data) {
    return this.http.post(`${this.baseUrl}get/high_availability/`, data);
  }
  readAccessOptions(id) {
    return this.http.options(`${this.baseUrl}${id}/access_list/`);
  }

  createHost(id, data) {
    return this.http.post(`${this.baseUrl}${id}/hosts/`, data);
  }

  readHosts(id, params) {
    return this.http.get(`${this.baseUrl}${id}/hosts/`, {
      params,
    });
  }

  async readHostDetail(inventoryId, hostId) {
    const {
      data: { results },
    } = await this.http.get(
      `${this.baseUrl}${inventoryId}/hosts/?id=${hostId}`
    );

    if (Array.isArray(results) && results.length) {
      return results[0];
    }

    throw new Error(
      `How did you get here? Host not found for Inventory ID: ${inventoryId}`
    );
  }

  readGroups(id, params) {
    return this.http.get(`${this.baseUrl}${id}/groups/`, {
      params,
    });
  }

  readGroupsOptions(id) {
    return this.http.options(`${this.baseUrl}${id}/groups/`);
  }

  readHostsOptions(id) {
    return this.http.options(`${this.baseUrl}${id}/hosts/`);
  }

  promoteGroup(inventoryId, groupId) {
    return this.http.post(`${this.baseUrl}${inventoryId}/groups/`, {
      id: groupId,
      disassociate: true,
    });
  }

  readInputInventories(inventoryId, params) {
    return this.http.get(`${this.baseUrl}${inventoryId}/input_inventories/`, {
      params,
    });
  }

  readSources(inventoryId, params) {
    return this.http.get(`${this.baseUrl}${inventoryId}/inventory_sources/`, {
      params,
    });
  }

  updateSources(inventoryId) {
    return this.http.get(
      `${this.baseUrl}${inventoryId}/update_inventory_sources/`
    );
  }

  async readSourceDetail(inventoryId, sourceId) {
    const {
      data: { results },
    } = await this.http.get(
      `${this.baseUrl}${inventoryId}/inventory_sources/?id=${sourceId}`
    );

    if (Array.isArray(results) && results.length) {
      return results[0];
    }

    throw new Error(
      `How did you get here? Source not found for Inventory ID: ${inventoryId}`
    );
  }

  syncAllSources(inventoryId) {
    return this.http.post(
      `${this.baseUrl}${inventoryId}/update_inventory_sources/`
    );
  }

  readAdHocOptions(inventoryId) {
    return this.http.options(`${this.baseUrl}${inventoryId}/ad_hoc_commands/`);
  }

  launchAdHocCommands(inventoryId, values) {
    return this.http.post(
      `${this.baseUrl}${inventoryId}/ad_hoc_commands/`,
      values
    );
  }

  associateLabel(id, label, orgId) {
    return this.http.post(`${this.baseUrl}${id}/labels/`, {
      name: label.name,
      organization: orgId,
    });
  }

  disassociateLabel(id, label) {
    return this.http.post(`${this.baseUrl}${id}/labels/`, {
      id: label.id,
      disassociate: true,
    });
  }

  associateInventory(id, inputInventoryId) {
    return this.http.post(`${this.baseUrl}${id}/input_inventories/`, {
      id: inputInventoryId,
    });
  }

  disassociateInventory(id, inputInventoryId) {
    return this.http.post(`${this.baseUrl}${id}/input_inventories/`, {
      id: inputInventoryId,
      disassociate: true,
    });
  }
}

export default Inventories;
