const sinon = require('sinon');
const expect = require('chai').expect;
const assignUserController = require('../../src/skillsControllers/assign_user_controller.js');
const serviceNowClient = require('../../src/service_now_client.js');

describe('assign user controller', () => {
  describe('assignUserToEntity', () => {
    const tableName = 'entity_table';
    const description = 'entity';
    const entityId = 'someSysId';
    let bot;

    const message = {
      user: 'someone@example.com',
    };

    beforeEach(() => {
      sinon.stub(serviceNowClient, 'getTableRecords').returns(Promise.resolve());
      sinon.stub(serviceNowClient, 'updateTableRecord').returns(Promise.resolve());

      process.env.base_url = 'servicenow-instance.domain';
      bot = { reply: sinon.spy() };
    });

    afterEach(() => {
      serviceNowClient.getTableRecords.restore();
      serviceNowClient.updateTableRecord.restore();
      delete process.env.base_url;
    });

    it('getTableRecords should be called', () => {
      return assignUserController
        .assignUserToEntity(tableName, entityId, description, bot, message)
        .then(() => {
          expect(serviceNowClient.getTableRecords.calledOnce).to.be.true;
          expect(serviceNowClient.getTableRecords.args[0]).to.deep.equal(['sys_user', { sysparm_query: `email=${message.user}` }]);
        });
    });

    describe('when getTableRecords for entity fails', () => {
      it('should reply with an error message', () => {
        const getTableRecordPromiseReject = Promise.reject('Bad things');
        serviceNowClient.getTableRecords.returns(getTableRecordPromiseReject);
        return assignUserController
          .assignUserToEntity(tableName, entityId, description, bot, message)
          .then(() => {
            expect(bot.reply.calledOnce).to.be.true;
            expect(bot.reply.args[0]).to.deep.equal([message, 'Sorry, I was unable to assign you to the entity. Bad things']);
          });
      });
    });

    describe('when the user is not found', () => {
      it('should reply with appropriate error message', () => {
        serviceNowClient.getTableRecords.withArgs('sys_user', { sysparm_query: `email=${message.user}` }).returns(Promise.resolve({ result: [] }));

        return assignUserController
          .assignUserToEntity(tableName, entityId, description, bot, message)
          .then(() => {
            expect(bot.reply.calledOnce).to.be.true;
            expect(bot.reply.args[0]).to.deep.equal([message, 'Sorry, I was unable to assign you to the entity. No ServiceNow user account found.']);
          });
      });
    });

    describe('when the user is found', () => {
      const expectedUsers = [
        {
          sys_id: '12345',
        },
      ];

      beforeEach(() => {
        serviceNowClient.getTableRecords.returns(Promise.resolve({ result: expectedUsers }));
      });

      it('should call updateTableRecord for entity', () => {
        return assignUserController
          .assignUserToEntity(tableName, entityId, description, bot, message)
          .then(() => {
            expect(serviceNowClient.updateTableRecord.calledOnce).to.be.true;
            expect(serviceNowClient.updateTableRecord.args[0]).to.deep.equal(['entity_table', 'someSysId', { assigned_to: '12345' }]);
          });
      });

      describe('when updateTableRecord for entity fails', () => {
        it('should reply with an error message', () => {
          const updateTableRecordPromiseReject = Promise.reject('Bad things');
          serviceNowClient.updateTableRecord.returns(updateTableRecordPromiseReject);
          return assignUserController
            .assignUserToEntity(tableName, entityId, description, bot, message)
            .then(() => {
              expect(bot.reply.calledOnce).to.be.true;
              expect(bot.reply.args[0]).to.deep.equal([message, 'Sorry, I was unable to assign you to the entity. Bad things']);
            });
        });
      });

      describe('when updateTableRecord for entity succeeds', () => {
        it('should reply with a success message', () => {
          serviceNowClient.updateTableRecord.returns(Promise.resolve());

          return assignUserController
            .assignUserToEntity(tableName, entityId, description, bot, message)
            .then(() => {
              expect(bot.reply.calledOnce).to.be.true;
              expect(bot.reply.args[0]).to.deep.equal([message, 'You have been assigned to the entity: [someSysId](servicenow-instance.domain/entity_table.do?sys_id=someSysId)']);
            });
        });
      });
    });
  });
});
