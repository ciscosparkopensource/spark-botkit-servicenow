const sinon = require('sinon');
const expect = require('chai').expect;
const changeRequestAssign = require('../../src/skills/change_request_assign.js');
const assignUserController = require('../../src/skillsControllers/assign_user_controller.js');

describe('change request assign', () => {
  const controller = { hears: sinon.spy() };

  beforeEach(() => {
    changeRequestAssign(controller);
    process.env.serviceNowBaseUrl = 'servicenow-instance.domain';
  });

  afterEach(() => {
    delete process.env.serviceNowBaseUrl;
  });

  it('should register hear listener on controller', () => {
    expect(controller.hears.calledOnce).to.be.true;
    expect(controller.hears.args[0][0]).to.deep.equal(['cr assign (.*)']);
    expect(controller.hears.args[0][1]).to.equal('direct_message,direct_mention');
    expect(controller.hears.args[0][2]).to.be.a('function');
  });

  describe('listener callback', () => {
    let bot;
    let listenerCallback;

    const message = {
      match: 'cr assign someSysId'.match(/cr assign (.*)/),
      user: 'someone@example.com',
    };

    beforeEach(() => {
      listenerCallback = controller.hears.args[0][2];

      sinon.stub(assignUserController, 'assignUserToEntity');
    });

    afterEach(() => {
      assignUserController.assignUserToEntity.restore();
    });

    it('should call assignUserController\'s assignUserToEntity method', () => {
      listenerCallback(bot, message);

      const entity = {
        table: 'change_request',
        description: 'Change Request',
      };
      expect(assignUserController.assignUserToEntity.calledOnce).to.be.true;
      expect(assignUserController.assignUserToEntity.args[0]).to.deep.equal([entity, bot, message]);
    });
  });
});
